import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  PDF,
  createBrand,
  createCatalogItem,
  createGroup,
  createStore,
  ownerDb,
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BO = '/api/v1/backoffice';
const TN = '/api/v1/tenant';

describe('página da loja · ferramentas, canais, documentos e responsáveis', () => {
  let owner: Record<string, string>;
  let infoprice: string;
  let whatsapp: string;

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    const group = await createGroup(417, 'Grupo Aurora');
    owner = ownerHeaders(group.id);
    await createStore(group.id, brand.id, 2);
    infoprice = (
      await createCatalogItem('EXTERNAL_TOOL', 'Infoprice', { negotiatedMonthlyCents: 49000 })
    ).id;
    whatsapp = (await createCatalogItem('CHANNEL', 'WhatsApp', { groupLabel: 'terc' })).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('o grupo informa ferramenta com custo; a Farmarcas só acompanha', async () => {
    const saved = await request(app)
      .put(`${TN}/stores/2/tools/${infoprice}`)
      .set(owner)
      .send({ uses: true, monthlyCostCents: 65000 });
    const platform = await request(app)
      .put(`${BO}/stores/2/tools/${infoprice}`)
      .set(ADMIN_HEADERS)
      .send({ uses: false });
    const history = await request(app).get(`${BO}/stores/2/history`).set(ADMIN_HEADERS);

    expect(saved.body.tools).toEqual([{ itemId: infoprice, uses: true, monthlyCostCents: 65000 }]);
    expect(platform.status).toBe(403);
    expect(history.body.data[0]).toMatchObject({
      fieldLabel: 'Ferramentas · Infoprice',
      oldValue: 'Não informado',
      newValue: 'Usa · R$ 650/mês',
    });
  });

  it('itens próprios e a declaração "não usa ferramentas externas"', async () => {
    const added = await request(app).post(`${TN}/stores/2/custom-entries`).set(owner).send({
      kind: 'EXTERNAL_TOOL',
      name: 'Planilha de escala própria',
      category: 'Gestão de equipe',
      monthlyCostCents: 0,
    });
    const entryId = added.body.customEntries[0].id;
    const updated = await request(app)
      .patch(`${TN}/stores/2/custom-entries/${entryId}`)
      .set(owner)
      .send({ monthlyCostCents: 1500 });
    const removed = await request(app)
      .delete(`${TN}/stores/2/custom-entries/${entryId}`)
      .set(owner);
    const declared = await request(app)
      .put(`${TN}/stores/2/no-external-tools`)
      .set(owner)
      .send({ value: true });

    expect(added.status).toBe(201);
    expect(updated.body.customEntries[0].monthlyCostCents).toBe(1500);
    expect(removed.body.customEntries).toEqual([]);
    expect(declared.body.noExternalTools).toBe(true);
  });

  it('canais: o grupo responde Sim ou Não e informa a identificação', async () => {
    const yes = await request(app)
      .put(`${TN}/stores/2/channels/${whatsapp}`)
      .set(owner)
      .send({ uses: true, identifier: '(11) 90000-4120' });
    const no = await request(app)
      .put(`${TN}/stores/2/channels/${whatsapp}`)
      .set(owner)
      .send({ uses: false, identifier: 'x' });
    const missing = await request(app)
      .put(`${TN}/stores/2/channels/${whatsapp}`)
      .set(owner)
      .send({ identifier: 'x' });

    expect(yes.body.channels).toEqual([
      { itemId: whatsapp, uses: true, identifier: '(11) 90000-4120' },
    ]);
    expect(no.body.channels).toEqual([{ itemId: whatsapp, uses: false, identifier: null }]);
    expect(missing.status).toBe(400);
  });

  it('documentos: lista com status, alerta e quem envia cada tipo', async () => {
    const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    await request(app)
      .post(`${TN}/stores/2/documents`)
      .set(owner)
      .field('docType', 'SANITARY_LICENSE')
      .field('validUntil', soon)
      .attach('file', PDF, 'licenca.pdf');
    const card = await request(app)
      .post(`${BO}/stores/2/documents`)
      .set(ADMIN_HEADERS)
      .field('docType', 'CNPJ_CARD')
      .attach('file', PDF, 'cartao.pdf');
    const list = await request(app).get(`${TN}/stores/2/documents`).set(owner);
    const page = await request(app).get(`${TN}/stores/2`).set(owner);

    const byType = Object.fromEntries(
      list.body.data.map((doc: { docType: string }) => [doc.docType, doc]),
    );
    expect(card.status).toBe(201);
    expect(byType.SANITARY_LICENSE).toMatchObject({ status: 'due_soon', canUpload: true });
    expect(byType.CNPJ_CARD).toMatchObject({ status: 'valid', canUpload: false });
    expect(byType.AFE).toMatchObject({ status: 'missing', document: null });
    expect(page.body.documentAlerts).toBe(1);
  });

  it('responsáveis: o proprietário aparece por código para o analista', async () => {
    const admin = await request(app).get(`${BO}/stores/2`).set(ADMIN_HEADERS);
    const analyst = await request(app).get(`${BO}/stores/2`).set(ANALYST_HEADERS);

    expect(admin.body.owner).toMatchObject({
      name: 'Dona Grupo Aurora',
      email: 'dona417@exemplo.com.br',
    });
    expect(analyst.body.owner).toEqual({
      pseudonym: 'F-00417',
      name: null,
      email: null,
      phone: null,
    });
  });
});
