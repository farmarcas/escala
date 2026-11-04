// Gate de isolamento da área do grupo (spec 002, FR-004; Product Vision §9, invariante 11).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import { withActor } from '../../shared/database/with-actor.js';
import {
  ADMIN_HEADERS,
  PDF,
  createBrand,
  createGroup,
  createStore,
  ownerDb,
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';

describe('isolamento da área do grupo', () => {
  let groupA: { id: string };
  let groupB: { id: string };
  let docB: string;
  let requestB: string;

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    groupA = await createGroup(101, 'Grupo A');
    groupB = await createGroup(202, 'Grupo B');
    await createStore(groupA.id, brand.id, 1);
    const storeB = await createStore(groupB.id, brand.id, 2);
    const doc = await ownerDb.storeDocument.create({
      data: {
        storeId: storeB.id,
        economicGroupId: groupB.id,
        docType: 'AFE',
        fileName: 'afe-b.pdf',
        mimeType: 'application/pdf',
        sizeBytes: PDF.length,
        uploadedByKind: 'TENANT',
        uploadedBy: 'F-00202',
        file: { create: { content: new Uint8Array(PDF) } },
      },
    });
    docB = doc.id;
    const req = await ownerDb.storeChangeRequest.create({
      data: {
        storeId: storeB.id,
        economicGroupId: groupB.id,
        type: 'TAX_REGIME',
        origin: 'TENANT',
        requestedBy: 'F-00202',
        requestedValues: { taxRegime: 'SIMPLES' },
        justification: 'teste',
      },
    });
    requestB = req.id;
    const service = await ownerDb.catalogItem.create({
      data: { kind: 'SERVICE', name: 'Dermocosméticos' },
    });
    await ownerDb.storeCatalogEntry.create({
      data: { storeId: storeB.id, catalogItemId: service.id },
    });
    await ownerDb.storeOpeningHour.create({
      data: { storeId: storeB.id, day: 'MON', isOpen: true, opensAt: '08:00', closesAt: '20:00' },
    });
    await ownerDb.storeFreeSection.create({
      data: {
        storeId: storeB.id,
        title: 'Visita',
        createdBy: 'OP-03',
        fields: { create: { label: 'Nota', value: 'x' } },
      },
    });
    await ownerDb.storeCustomEntry.create({
      data: { storeId: storeB.id, kind: 'EXTERNAL_TOOL', name: 'Planilha', monthlyCostCents: 0 },
    });
    await ownerDb.storeHistory.create({
      data: {
        storeId: storeB.id,
        economicGroupId: groupB.id,
        kind: 'EDIT',
        fieldLabel: 'Telefone 1',
        actorKind: 'TENANT',
        actorSubject: 'F-00202',
        actorRole: 'TENANT_ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('o grupo A lista só as próprias lojas', async () => {
    const response = await request(app).get('/api/v1/tenant/stores').set(ownerHeaders(groupA.id));

    expect(response.status).toBe(200);
    expect(response.body.data.map((store: { code: number }) => store.code)).toEqual([1]);
  });

  it('loja, documento, solicitação e histórico do grupo B não existem para o grupo A', async () => {
    const headers = ownerHeaders(groupA.id);
    const responses = await Promise.all([
      request(app).get('/api/v1/tenant/stores/2').set(headers),
      request(app).get('/api/v1/tenant/stores/2/history').set(headers),
      request(app).get(`/api/v1/tenant/stores/2/documents/${docB}/file`).set(headers),
      request(app)
        .post(`/api/v1/tenant/change-requests/${requestB}/actions`)
        .set(headers)
        .send({ action: 'cancel', expectedVersion: 1 }),
      request(app)
        .patch('/api/v1/tenant/stores/2')
        .set(headers)
        .send({ expectedVersion: 1, basic: { phone1: '11999990000' } }),
      request(app).put('/api/v1/tenant/stores/2/strategies').set(headers).send({ itemIds: [] }),
    ]);

    for (const response of responses) expect(response.status).toBe(404);
    expect(
      await ownerDb.storeChangeRequest.count({ where: { id: requestB, status: 'OPEN' } }),
    ).toBe(1);
  });

  it('no banco, as tabelas novas também escondem o grupo B', async () => {
    const seen = await withActor(
      { kind: 'tenant', subject: 'F-00101', role: 'TENANT_ADMIN', tenantId: groupA.id },
      async (tx) => ({
        docs: await tx.storeDocument.count(),
        files: await tx.storeDocumentFile.count(),
        requests: await tx.storeChangeRequest.count(),
        history: await tx.storeHistory.count(),
        hours: await tx.storeOpeningHour.count(),
        entries: await tx.storeCatalogEntry.count(),
        sections: await tx.storeFreeSection.count(),
        fields: await tx.storeFreeField.count(),
        custom: await tx.storeCustomEntry.count(),
      }),
    );
    expect(seen).toEqual({
      docs: 0,
      files: 0,
      requests: 0,
      history: 0,
      hours: 0,
      entries: 0,
      sections: 0,
      fields: 0,
      custom: 0,
    });
  });

  it('cada caminho aceita só o seu lado', async () => {
    const platformOnTenant = await request(app).get('/api/v1/tenant/stores').set(ADMIN_HEADERS);
    const tenantOnBackoffice = await request(app)
      .get('/api/v1/backoffice/stores')
      .set(ownerHeaders(groupA.id));

    expect(platformOnTenant.status).toBe(403);
    expect(tenantOnBackoffice.status).toBe(403);
  });

  it('sem grupo válido no papel de demonstração, ninguém entra', async () => {
    const response = await request(app)
      .get('/api/v1/tenant/stores')
      .set({ 'x-demo-role': 'owner', 'x-demo-tenant': 'nao-e-um-id' });

    expect(response.status).toBe(401);
  });
});
