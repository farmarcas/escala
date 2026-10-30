import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  createBrand,
  createGroup,
  createStore,
  makeCnpj,
  ownerDb,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const GROUPS = '/api/v1/backoffice/economic-groups';
const STORES = '/api/v1/backoffice/stores';

describe('stores routes', () => {
  let brandId: string;
  let groupId: string;

  const newStore = () => ({
    name: 'Drogaria Aurora Moema',
    type: 'PDV',
    cnpj: makeCnpj('415832760092'),
    brandId,
    street: 'Av. Ibirapuera',
    number: '2000',
    district: 'Moema',
    city: 'São Paulo',
    uf: 'SP',
    openedAt: '2026-10-22',
  });

  beforeEach(async () => {
    await resetBackoffice();
    brandId = (await createBrand('rede aurora')).id;
    groupId = (await createGroup(417, 'Grupo Aurora')).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('deve cadastrar loja pendente com código e auditar no grupo', async () => {
    await createStore(groupId, brandId, 91);

    const response = await request(app)
      .post(`${GROUPS}/417/stores`)
      .set(ADMIN_HEADERS)
      .send(newStore());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      code: 92,
      groupNumber: 417,
      status: 'PENDING',
      openedAt: '2026-10-22',
      brand: { id: brandId },
    });
    const audit = await ownerDb.auditEvent.findFirst({ where: { action: 'STORE_CREATED' } });
    expect(audit).toMatchObject({
      economicGroupId: groupId,
      summary: expect.stringContaining('LJ-092'),
    });
  });

  it('deve recusar CNPJ inválido, CNPJ repetido, marca histórica e grupo arquivado', async () => {
    const historical = await createBrand('rede antiga', 'HISTORICAL');
    await createGroup(214, 'Grupo Brisa', { status: 'ARCHIVED' });
    await request(app).post(`${GROUPS}/417/stores`).set(ADMIN_HEADERS).send(newStore());

    const post = (number: number, body: object) =>
      request(app).post(`${GROUPS}/${number}/stores`).set(ADMIN_HEADERS).send(body);

    const invalid = await post(417, { ...newStore(), cnpj: '00.000.000/0000-00' });
    const repeated = await post(417, newStore());
    const brand = await post(417, {
      ...newStore(),
      cnpj: makeCnpj('415832760093'),
      brandId: historical.id,
    });
    const archived = await post(214, { ...newStore(), cnpj: makeCnpj('415832760094') });

    expect(invalid.status).toBe(400);
    expect(repeated.body.error.code).toBe('STORE_CNPJ_TAKEN');
    expect(brand.body.error.code).toBe('BRAND_INACTIVE');
    expect(archived.body.error.code).toBe('GROUP_ARCHIVED');
  });

  it('deve listar lojas do grupo e da rede com filtros', async () => {
    const other = await createGroup(388, 'Grupo Lumen');
    await createStore(groupId, brandId, 1, { name: 'Aurora Centro', city: 'São Paulo' });
    await createStore(groupId, brandId, 90, { name: 'CD Aurora', type: 'CD', city: 'Cajamar' });
    await createStore(other.id, brandId, 101, { name: 'Lumen Batel', uf: 'PR', city: 'Curitiba' });

    const codes = async (url: string) =>
      (await request(app).get(url)).body.data.map((store: { code: number }) => store.code);

    expect(await codes(`${GROUPS}/417/stores`)).toEqual([1, 90]);
    expect(await codes(`${GROUPS}/417/stores?type=CD`)).toEqual([90]);
    expect(await codes(`${GROUPS}/417/stores?search=cajamar`)).toEqual([90]);
    // Ordenado pelo número do GE e depois pelo código da loja.
    expect(await codes(STORES)).toEqual([101, 1, 90]);
    expect(await codes(`${STORES}?uf=PR`)).toEqual([101]);
    expect(await codes(`${STORES}?search=lumen`)).toEqual([101]);
    expect(await codes(`${STORES}?search=LJ-090`)).toEqual([90]);

    const stats = await request(app).get(`${STORES}/stats`);
    expect(stats.body).toMatchObject({
      total: 3,
      pdv: 2,
      cd: 1,
      active: 3,
      pending: 0,
      inactive: 0,
      groups: 2,
    });
  });

  it('deve inativar loja e responder 404 para loja inexistente', async () => {
    const store = await createStore(groupId, brandId, 1);

    const updated = await request(app)
      .patch(`${STORES}/${store.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ status: 'INACTIVE' });
    const missing = await request(app)
      .patch(`${STORES}/00000000-0000-4000-8000-000000000000/status`)
      .set(ADMIN_HEADERS)
      .send({ status: 'INACTIVE' });

    expect(updated.body.status).toBe('INACTIVE');
    expect(missing.status).toBe(404);
  });
});
