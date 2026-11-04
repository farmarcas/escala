import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  createBrand,
  createGroup,
  createStore,
  ownerDb,
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';

describe('visão geral', () => {
  let brandA: string;
  let tenant: Record<string, string>;

  beforeEach(async () => {
    await resetBackoffice();
    brandA = (await createBrand('marca a')).id;
    const brandB = (await createBrand('marca b')).id;
    const g1 = await createGroup(1, 'Grupo Um');
    const g2 = await createGroup(2, 'Grupo Dois', { owner: false });
    await createGroup(3, 'Grupo Três', { status: 'SUSPENDED' });
    tenant = ownerHeaders(g1.id);
    await createStore(g1.id, brandA, 1, { uf: 'SP' });
    const s2 = await createStore(g1.id, brandB, 2, { uf: 'MG', type: 'CD' });
    await createStore(g2.id, brandB, 3, { uf: 'MG' });
    await ownerDb.store.update({
      where: { id: s2.id },
      data: { validatedAt: new Date(), status: 'PENDING' },
    });
    await ownerDb.storeChangeRequest.create({
      data: {
        storeId: s2.id,
        economicGroupId: g1.id,
        type: 'TAX_REGIME',
        origin: 'TENANT',
        requestedBy: 'F-00001',
        requestedValues: { taxRegime: 'SIMPLES' },
        justification: 'x',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('calcula grupos, lojas e pontos de atenção do cadastro', async () => {
    const response = await request(app).get('/api/v1/backoffice/overview').set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.body.groups).toEqual({
      all: 3,
      active: 2,
      suspended: 1,
      archived: 0,
      withoutOwner: 1,
    });
    expect(response.body.stores).toEqual({ total: 3, pdv: 2, cd: 1 });
    expect(response.body.attention).toMatchObject({
      groupsWithoutOwner: 1,
      storesValidationAttention: { stores: 2, groups: 2 },
      requestsWaitingPlatform: { requests: 1, stores: 1 },
      storesPending: 1,
    });
  });

  it('filtra pela marca e pela UF da loja', async () => {
    const byBrand = await request(app)
      .get(`/api/v1/backoffice/overview?brandId=${brandA}`)
      .set(ADMIN_HEADERS);
    const byUf = await request(app).get('/api/v1/backoffice/overview?uf=MG').set(ADMIN_HEADERS);

    expect(byBrand.body.groups.all).toBe(1);
    expect(byBrand.body.stores).toEqual({ total: 1, pdv: 1, cd: 0 });
    expect(byUf.body.groups).toMatchObject({ all: 2, withoutOwner: 1 });
    expect(byUf.body.stores.total).toBe(2);
  });

  it('é exclusiva do operador', async () => {
    const response = await request(app).get('/api/v1/backoffice/overview').set(tenant);

    expect(response.status).toBe(403);
  });
});
