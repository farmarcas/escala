// Gate de isolamento (Product Vision §9, invariante 11; spec FR-055 a FR-058).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { withActor } from '../../shared/database/with-actor.js';
import { prisma } from '../../shared/database/prisma.js';
import { noIdentityProvider } from '../../shared/identity/demo-identity-provider.js';
import type { TenantIdentity } from '../../shared/identity/identity.js';
import {
  ANALYST_HEADERS,
  createBrand,
  createGroup,
  createStore,
  makeCnpj,
  ownerDb,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const tenant = (tenantId: string): TenantIdentity => ({
  kind: 'tenant',
  subject: 'F-TEST1',
  role: 'TENANT_ADMIN',
  tenantId,
});

describe('isolamento entre tenants', () => {
  let groupA: { id: string };
  let groupB: { id: string };
  let brandId: string;

  beforeEach(async () => {
    await resetBackoffice();
    brandId = (await createBrand('Rede Teste')).id;
    groupA = await createGroup(101, 'Grupo A');
    groupB = await createGroup(202, 'Grupo B');
    await createStore(groupA.id, brandId, 1);
    await createStore(groupB.id, brandId, 2);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('não deve mostrar nenhuma linha quando ninguém se identificou no banco', async () => {
    expect(await prisma.store.count()).toBe(0);
    expect(await prisma.economicGroup.count()).toBe(0);
    expect(await prisma.groupOwner.count()).toBe(0);
  });

  it('deve mostrar ao tenant A só as próprias linhas', async () => {
    const seen = await withActor(tenant(groupA.id), async (tx) => ({
      stores: await tx.store.findMany({ select: { economicGroupId: true } }),
      groups: await tx.economicGroup.findMany({ select: { id: true } }),
      owners: await tx.groupOwner.findMany({ select: { economicGroupId: true } }),
    }));

    expect(seen.stores).toEqual([{ economicGroupId: groupA.id }]);
    expect(seen.groups).toEqual([{ id: groupA.id }]);
    expect(seen.owners).toEqual([{ economicGroupId: groupA.id }]);
  });

  it('deve impedir o tenant A de gravar no tenant B', async () => {
    const attempt = withActor(tenant(groupA.id), (tx) =>
      tx.store.create({
        data: {
          economicGroupId: groupB.id,
          brandId,
          name: 'Invasora',
          type: 'PDV',
          cnpj: makeCnpj('987654320001'),
          street: 'Rua X',
          number: '1',
          city: 'São Paulo',
          uf: 'SP',
        },
      }),
    );

    await expect(attempt).rejects.toThrow();
    expect(await ownerDb.store.count({ where: { economicGroupId: groupB.id } })).toBe(1);
  });

  it('deve impedir o tenant A de alterar linha do tenant B', async () => {
    const updated = await withActor(tenant(groupA.id), (tx) =>
      tx.store.updateMany({ where: { economicGroupId: groupB.id }, data: { name: 'Hackeada' } }),
    );

    expect(updated.count).toBe(0);
  });

  it('deve recusar identidade de tenant no caminho do operador', async () => {
    const app = createApp({ identityProvider: () => tenant(groupA.id) });

    const response = await request(app).get('/api/v1/backoffice/economic-groups');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('deve recusar requisição sem identidade quando não há provedor', async () => {
    const app = createApp({ identityProvider: noIdentityProvider });

    const response = await request(app).get('/api/v1/backoffice/brands');

    expect(response.status).toBe(401);
  });

  it('não deve entregar dado pessoal do proprietário ao analista em nenhuma leitura', async () => {
    const app = createApp();
    const responses = await Promise.all([
      request(app).get('/api/v1/backoffice/economic-groups').set(ANALYST_HEADERS),
      request(app).get('/api/v1/backoffice/economic-groups/101').set(ANALYST_HEADERS),
      request(app).get('/api/v1/backoffice/economic-groups?search=Dona').set(ANALYST_HEADERS),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toMatch(/Dona Grupo|dona101@|11900000000/);
    }
    expect(responses[0]?.body.data[0].owner).toEqual({ pseudonym: 'F-00101' });
    expect(responses[2]?.body.data).toEqual([]);
  });

  it('deve recusar toda escrita do analista', async () => {
    const app = createApp();
    const writes = [
      request(app).post('/api/v1/backoffice/brands').send({ name: 'Nova' }),
      request(app).patch(`/api/v1/backoffice/brands/${brandId}`).send({ name: 'Nova' }),
      request(app).delete(`/api/v1/backoffice/brands/${brandId}`),
      request(app).post('/api/v1/backoffice/economic-groups').send({}),
      request(app).patch('/api/v1/backoffice/economic-groups/101').send({ name: 'X' }),
      request(app)
        .post('/api/v1/backoffice/economic-groups/101/status-changes')
        .send({ action: 'suspend', justification: 'x' }),
      request(app).post('/api/v1/backoffice/economic-groups/101/stores').send({}),
      request(app).patch(`/api/v1/backoffice/stores/${brandId}/status`).send({ status: 'ACTIVE' }),
    ];

    for (const response of await Promise.all(writes.map((write) => write.set(ANALYST_HEADERS)))) {
      expect(response.status).toBe(403);
    }
  });
});
