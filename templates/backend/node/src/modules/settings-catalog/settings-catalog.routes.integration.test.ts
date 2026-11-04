import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  createBrand,
  createCatalogItem,
  createGroup,
  createStore,
  ownerDb,
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BASE = '/api/v1/backoffice/settings/catalog';
const TN = '/api/v1/tenant';

describe('Configurações · atributos da loja', () => {
  let owner: Record<string, string>;

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    const group = await createGroup(417, 'Grupo Aurora');
    owner = ownerHeaders(group.id);
    await createStore(group.id, brand.id, 2);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  const createFurniture = (overrides: Record<string, unknown> = {}) =>
    request(app)
      .post(`${BASE}/furniture`)
      .set(ADMIN_HEADERS)
      .send({
        name: 'Expositor de vitaminas',
        groupLabel: 'expositor',
        icon: 'tower',
        ...overrides,
      });

  it('o administrador inclui mobiliário com ícone e a loja vê na próxima abertura', async () => {
    await createCatalogItem('FURNITURE', 'Gôndolas', { groupLabel: 'gondola' });
    const created = await createFurniture();
    const list = await request(app).get(`${BASE}/furniture`).set(ADMIN_HEADERS);
    const summary = await request(app).get(BASE).set(ADMIN_HEADERS);
    const catalog = await request(app).get(`${TN}/catalog`).set(owner);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Expositor de vitaminas',
      icon: 'tower',
      selfService: true,
      active: true,
      position: 2,
      inUse: 0,
      version: 1,
    });
    expect(list.body.data.map((item: { name: string }) => item.name)).toEqual([
      'Gôndolas',
      'Expositor de vitaminas',
    ]);
    expect(summary.body.data).toContainEqual({
      kind: 'furniture',
      label: 'Mobiliário',
      section: 'store',
      active: 2,
      inactive: 0,
    });
    expect(catalog.body.data).toContainEqual(
      expect.objectContaining({ name: 'Expositor de vitaminas', icon: 'tower', selfService: true }),
    );
  });

  it('só o administrador entra, inclusive para ler; o banco recusa gravação do grupo', async () => {
    const analyst = await Promise.all([
      request(app).get(BASE).set(ANALYST_HEADERS),
      request(app).get(`${BASE}/services`).set(ANALYST_HEADERS),
      request(app).post(`${BASE}/services`).set(ANALYST_HEADERS).send({ name: 'Vacinação' }),
    ]);
    const tenant = await request(app).get(`/api/v1/backoffice/settings/catalog`).set(owner);
    const viaDb = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.actor_kind', 'tenant', true)`;
      return tx.catalogItem.create({ data: { kind: 'SERVICE', name: 'Invasor' } });
    });

    expect(analyst.map((response) => response.status)).toEqual([403, 403, 403]);
    expect(tenant.status).toBe(403);
    await expect(viaDb).rejects.toThrow();
  });

  it('recusa nome repetido sem diferença de acento e maiúscula, campo de outra lista e ícone fora da galeria', async () => {
    await createCatalogItem('FURNITURE', 'Gôndolas', { groupLabel: 'gondola' });
    const duplicate = await createFurniture({ name: 'gondolas' });
    const otherList = await request(app)
      .post(`${BASE}/services`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Vacinação', icon: 'pill' });
    const badIcon = await createFurniture({ icon: 'rocket' });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toMatchObject({
      code: 'DUPLICATE_NAME',
      details: [{ existing: 'Gôndolas' }],
    });
    expect(otherList.status).toBe(400);
    expect(badIcon.status).toBe(400);
  });

  it('altera com a versão lida, recusa versão velha e grava o antes e depois no histórico', async () => {
    const created = await request(app)
      .post(`${BASE}/services`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Aferição de Glicemia' });
    const id = created.body.id as string;
    const renamed = await request(app)
      .patch(`${BASE}/services/${id}`)
      .set(ADMIN_HEADERS)
      .send({ version: 1, name: 'Teste de glicemia' });
    const stale = await request(app)
      .patch(`${BASE}/services/${id}`)
      .set(ADMIN_HEADERS)
      .send({ version: 1, name: 'Outro nome' });
    const history = await request(app).get(`${BASE}/services/audit-events`).set(ADMIN_HEADERS);

    expect(renamed.body).toMatchObject({ name: 'Teste de glicemia', version: 2 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    expect(history.body.data.map((event: { summary: string }) => event.summary)).toEqual([
      'Serviços · Aferição de Glicemia: Nome: Aferição de Glicemia → Teste de glicemia',
      'Serviços · Aferição de Glicemia: incluído',
    ]);
    expect(history.body.data[0]).toMatchObject({
      action: 'CATALOG_ITEM_UPDATED',
      actorSubject: 'OP-02',
    });
  });

  it('cada lista aceita os próprios campos, sugere operadoras e busca sem acento', async () => {
    await createCatalogItem('PBM', 'VIDALINK', { groupLabel: 'Vidalink' });
    await createCatalogItem('PBM', 'ABBOTT - ABRACE A VIDA', { groupLabel: 'Funcional' });
    const strategy = await request(app)
      .post(`${BASE}/strategies`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Farmácia 24 horas', description: 'Aberta sempre', usedByScale: true });
    const tool = await request(app)
      .post(`${BASE}/external-tools`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Nova ferramenta', groupLabel: 'Financeiro', negotiatedMonthlyCents: 12000 });
    const channel = await request(app)
      .post(`${BASE}/channels`)
      .set(ADMIN_HEADERS)
      .send({ name: 'TikTok', groupLabel: 'terc', description: 'Perfil' });
    const pbms = await request(app).get(`${BASE}/pbms?q=funcional`).set(ADMIN_HEADERS);
    const catalog = await request(app).get(`${TN}/catalog?kind=STRATEGY`).set(owner);

    expect([strategy.status, tool.status, channel.status]).toEqual([201, 201, 201]);
    expect(pbms.body.data.map((item: { name: string }) => item.name)).toEqual([
      'ABBOTT - ABRACE A VIDA',
    ]);
    expect(pbms.body.meta.suggestions).toEqual(['Funcional', 'Vidalink']);
    expect(catalog.body.data[0]).toMatchObject({ name: 'Farmácia 24 horas', usedByScale: true });
  });

  it('muda a ordem e a página da loja segue', async () => {
    const first = await createCatalogItem('SERVICE', 'Dermocosméticos');
    const second = await request(app)
      .post(`${BASE}/services`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Vacinação' });
    const moved = await request(app)
      .post(`${BASE}/services/${second.body.id}/move`)
      .set(ADMIN_HEADERS)
      .send({ version: 1, direction: 'up' });
    const edge = await request(app)
      .post(`${BASE}/services/${second.body.id}/move`)
      .set(ADMIN_HEADERS)
      .send({ version: 2, direction: 'up' });
    const catalog = await request(app).get(`${TN}/catalog?kind=SERVICE`).set(owner);

    expect(moved.body.data.map((item: { id: string }) => item.id)).toEqual([
      second.body.id,
      first.id,
    ]);
    expect(edge.status).toBe(200);
    expect(catalog.body.data.map((item: { name: string }) => item.name)).toEqual([
      'Vacinação',
      'Dermocosméticos',
    ]);
  });

  it('desativado fica na loja que usa, não pode ser marcado de novo e não pode ser excluído', async () => {
    const pbm = await createCatalogItem('PBM', 'VIDALINK');
    const other = await createCatalogItem('PBM', 'ORIZON');
    const gondola = await createCatalogItem('FURNITURE', 'Gôndolas', { groupLabel: 'gondola' });
    const frio = await createCatalogItem('FURNITURE', 'Geladeira', { groupLabel: 'frio' });
    await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 1, selections: { pbms: [pbm.id] } });
    await request(app)
      .put(`${TN}/stores/2/furniture/${gondola.id}`)
      .set(owner)
      .send({ quantity: 4, tradeQuantity: 0 });

    for (const [slug, id] of [
      ['pbms', pbm.id],
      ['pbms', other.id],
      ['furniture', gondola.id],
      ['furniture', frio.id],
    ] as const) {
      await request(app)
        .post(`${BASE}/${slug}/${id}/status`)
        .set(ADMIN_HEADERS)
        .send({ version: 1, active: false });
    }
    const entries = await ownerDb.storeCatalogEntry.count();
    const keep = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 2, selections: { pbms: [pbm.id] } });
    const markNew = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 2, selections: { pbms: [pbm.id, other.id] } });
    const lower = await request(app)
      .put(`${TN}/stores/2/furniture/${gondola.id}`)
      .set(owner)
      .send({ quantity: 0, tradeQuantity: 0 });
    const raise = await request(app)
      .put(`${TN}/stores/2/furniture/${frio.id}`)
      .set(owner)
      .send({ quantity: 1, tradeQuantity: 0 });
    const blocked = await request(app)
      .delete(`${BASE}/pbms/${pbm.id}?version=2`)
      .set(ADMIN_HEADERS);
    const catalog = await request(app).get(`${TN}/catalog?kind=PBM`).set(owner);

    expect(entries).toBe(2);
    expect(keep.status).toBe(200);
    expect(markNew.status).toBe(400);
    expect(markNew.body.error.code).toBe('CATALOG_ITEM_INACTIVE');
    expect(lower.status).toBe(200);
    expect(raise.body.error.code).toBe('CATALOG_ITEM_INACTIVE');
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toMatchObject({ code: 'IN_USE', details: [{ inUse: 1 }] });
    expect(catalog.body.data).toContainEqual(
      expect.objectContaining({ id: pbm.id, active: false }),
    );
  });

  it('exclui item sem uso, libera o nome e reativar devolve às opções', async () => {
    const created = await request(app)
      .post(`${BASE}/services`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Vacinação' });
    const removed = await request(app)
      .delete(`${BASE}/services/${created.body.id}?version=1`)
      .set(ADMIN_HEADERS);
    const catalog = await request(app).get(`${TN}/catalog?kind=SERVICE`).set(owner);
    const again = await request(app)
      .post(`${BASE}/services`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Vacinação' });
    await request(app)
      .post(`${BASE}/services/${again.body.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ version: 1, active: false });
    const reactivated = await request(app)
      .post(`${BASE}/services/${again.body.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ version: 2, active: true });
    const history = await request(app).get(`${BASE}/services/audit-events`).set(ADMIN_HEADERS);

    expect(removed.status).toBe(204);
    expect(catalog.body.data).toEqual([]);
    expect(again.status).toBe(201);
    expect(reactivated.body).toMatchObject({ active: true, version: 3 });
    expect(history.body.data.map((event: { action: string }) => event.action)).toEqual([
      'CATALOG_ITEM_REACTIVATED',
      'CATALOG_ITEM_DEACTIVATED',
      'CATALOG_ITEM_CREATED',
      'CATALOG_ITEM_DELETED',
      'CATALOG_ITEM_CREATED',
    ]);
  });
});
