import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  PDF,
  createBrand,
  createGroup,
  createStore,
  ownerDb,
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BO = '/api/v1/backoffice';
const TN = '/api/v1/tenant';

describe('página da loja', () => {
  let groupId: string;
  let owner: Record<string, string>;

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    const group = await createGroup(417, 'Grupo Aurora');
    groupId = group.id;
    owner = ownerHeaders(groupId);
    const store = await createStore(groupId, brand.id, 2);
    await ownerDb.store.update({
      where: { id: store.id },
      data: { ownerMobile: '11900004410', taxRegime: 'PRESUMIDO' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('abre pelos dois lados, com permissões de cada um', async () => {
    const platform = await request(app).get(`${BO}/stores/2`).set(ADMIN_HEADERS);
    const tenant = await request(app).get(`${TN}/stores/2`).set(owner);

    expect(platform.status).toBe(200);
    expect(platform.body).toMatchObject({
      side: 'platform',
      group: { number: 417 },
      permissions: { requiresReason: true, canEditOwnerPrivate: false, canRemind: true },
    });
    expect(tenant.body).toMatchObject({
      side: 'tenant',
      permissions: { requiresReason: false, canEditOwnerPrivate: true, canValidate: true },
    });
    expect(tenant.body.governance.total).toBe(30);
  });

  it('o analista vê só leitura e o dado pessoal do proprietário mascarado', async () => {
    const page = await request(app).get(`${BO}/stores/2`).set(ANALYST_HEADERS);
    const write = await request(app)
      .patch(`${BO}/stores/2`)
      .set(ANALYST_HEADERS)
      .send({ expectedVersion: 1, reason: 'x', basic: { phone1: '1130004100' } });

    expect(page.body.basic.ownerMobile).toBe('Pseudonimizado');
    expect(page.body.isReadOnly).toBe(true);
    expect(write.status).toBe(403);
  });

  it('o grupo edita dados básicos e cada campo vai para o histórico', async () => {
    const response = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 1, basic: { phone2: '(11) 3000-4121', name: 'Aurora Santana' } });
    const history = await request(app).get(`${BO}/stores/2/history`).set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.version).toBe(2);
    expect(response.body.basic.phone2).toBe('1130004121');
    expect(response.body.fieldMeta.phone2.by).toBe('Dona Grupo Aurora · proprietário');
    expect(history.body.data.map((row: { fieldLabel: string }) => row.fieldLabel).sort()).toEqual([
      'Apelido da loja',
      'Telefone 2',
    ]);
  });

  it('recusa versão antiga sem sobrescrever', async () => {
    await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 1, basic: { phone1: '1130004100' } });

    const stale = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 1, basic: { phone1: '1130009999' } });

    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STORE_VERSION_CONFLICT');
  });

  it('a Farmarcas corrige só com motivo e não altera dado pessoal; dado sensível exige solicitação', async () => {
    const noReason = await request(app)
      .patch(`${BO}/stores/2`)
      .set(ADMIN_HEADERS)
      .send({ expectedVersion: 1, basic: { phone1: '1130004100' } });
    const privateField = await request(app)
      .patch(`${BO}/stores/2`)
      .set(ADMIN_HEADERS)
      .send({ expectedVersion: 1, reason: 'x', basic: { ownerMobile: '11999990000' } });
    const sensitive = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 1, basic: { cnpj: '11222333000181' } });
    const ok = await request(app)
      .patch(`${BO}/stores/2`)
      .set(ADMIN_HEADERS)
      .send({
        expectedVersion: 1,
        reason: 'Pedido do grupo por telefone',
        basic: { phone1: '1130004100' },
      });

    expect(noReason.body.error.code).toBe('REASON_REQUIRED');
    expect(privateField.status).toBe(403);
    expect(sensitive.body.error.code).toBe('FIELD_REQUIRES_REQUEST');
    expect(ok.status).toBe(200);
    expect(ok.body.fieldMeta.phone1.by).toBe('OP-02 · Administrador da plataforma');
  });

  it('solicitação de regime: o grupo pede com documento e a Farmarcas torna vigente', async () => {
    const created = await request(app)
      .post(`${TN}/stores/2/change-requests`)
      .set(owner)
      .send({
        type: 'TAX_REGIME',
        values: { taxRegime: 'SIMPLES' },
        justification: 'Faturamento menor',
      });
    const duplicate = await request(app)
      .post(`${BO}/stores/2/change-requests`)
      .set(ADMIN_HEADERS)
      .send({ type: 'TAX_REGIME', values: { taxRegime: 'REAL' }, justification: 'x' });
    const tooEarly = await request(app)
      .post(`${BO}/change-requests/${created.body.id}/actions`)
      .set(ADMIN_HEADERS)
      .send({ action: 'advance', expectedVersion: 1 });
    const attached = await request(app)
      .post(`${TN}/change-requests/${created.body.id}/documents`)
      .set(owner)
      .field('docType', 'OPTION_TERM')
      .attach('file', PDF, 'termo.pdf');
    const notMine = await request(app)
      .post(`${TN}/change-requests/${created.body.id}/actions`)
      .set(owner)
      .send({ action: 'advance', expectedVersion: 1 });
    const approved = await request(app)
      .post(`${BO}/change-requests/${created.body.id}/actions`)
      .set(ADMIN_HEADERS)
      .send({ action: 'advance', expectedVersion: 1 });
    const page = await request(app).get(`${TN}/stores/2`).set(owner);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      status: 'OPEN',
      waitingFor: 'Farmarcas',
      isMyTurn: false,
    });
    expect(duplicate.body.error.code).toBe('REQUEST_ALREADY_OPEN');
    expect(tooEarly.body.error.code).toBe('DOCS_MISSING');
    expect(attached.status).toBe(200);
    expect(notMine.body.error.code).toBe('NOT_YOUR_STEP');
    expect(approved.body.status).toBe('EFFECTIVE');
    expect(page.body.business.taxRegime).toBe('SIMPLES');
  });

  it('documentos: o grupo envia licença com validade; arquivo falso é recusado', async () => {
    const ok = await request(app)
      .post(`${TN}/stores/2/documents`)
      .set(owner)
      .field('docType', 'SANITARY_LICENSE')
      .field('validUntil', '2030-01-01')
      .attach('file', PDF, 'licenca.pdf');
    const fake = await request(app)
      .post(`${TN}/stores/2/documents`)
      .set(owner)
      .field('docType', 'AFE')
      .attach('file', Buffer.from('MZ fake exe'), 'afe.pdf');
    const wrongSide = await request(app)
      .post(`${BO}/stores/2/documents`)
      .set(ADMIN_HEADERS)
      .field('docType', 'SANITARY_LICENSE')
      .attach('file', PDF, 'licenca.pdf');
    const list = await request(app).get(`${BO}/stores/2/documents`).set(ADMIN_HEADERS);
    const download = await request(app)
      .get(`${BO}/stores/2/documents/${ok.body.id}/file`)
      .set(ADMIN_HEADERS);

    expect(ok.status).toBe(201);
    expect(fake.status).toBe(415);
    expect(wrongSide.body.error.code).toBe('DOCUMENT_NOT_ALLOWED');
    expect(
      list.body.data.find((doc: { docType: string }) => doc.docType === 'SANITARY_LICENSE'),
    ).toMatchObject({ status: 'valid' });
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toBe('application/pdf');
  });

  it('validação: incompleta é recusada; a Farmarcas cobra e o histórico registra', async () => {
    const incomplete = await request(app)
      .post(`${TN}/stores/2/validation`)
      .set(owner)
      .send({ expectedVersion: 1 });
    const remind = await request(app)
      .post(`${BO}/stores/2/validation-reminders`)
      .set(ADMIN_HEADERS);
    const lowList = await request(app)
      .get(`${BO}/stores?completeness=low&validation=attention`)
      .set(ADMIN_HEADERS);

    expect(incomplete.body.error.code).toBe('INCOMPLETE');
    expect(remind.status).toBe(200);
    expect(remind.body.governance.validation.remindedAt).not.toBeNull();
    expect(lowList.body.data.map((store: { code: number }) => store.code)).toEqual([2]);
  });
});
