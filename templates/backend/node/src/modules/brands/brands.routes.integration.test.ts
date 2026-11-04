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
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BASE = '/api/v1/backoffice/brands';

describe('brands routes', () => {
  beforeEach(resetBackoffice);

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('deve criar marca ativa e registrar auditoria', async () => {
    const response = await request(app).post(BASE).set(ADMIN_HEADERS).send({ name: 'Mais Saúde' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Mais Saúde',
      status: 'ACTIVE',
      storeCount: 0,
      groupCount: 0,
    });
    expect(await ownerDb.auditEvent.count({ where: { action: 'BRAND_CREATED' } })).toBe(1);
  });

  it('deve responder 409 para nome repetido ignorando maiúsculas e acentos', async () => {
    await request(app).post(BASE).set(ADMIN_HEADERS).send({ name: 'Mais Saúde' });

    const response = await request(app).post(BASE).set(ADMIN_HEADERS).send({ name: 'MAIS SAUDE' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('BRAND_NAME_TAKEN');
  });

  it('deve responder 400 para nome curto ou campo desconhecido', async () => {
    const short = await request(app).post(BASE).set(ADMIN_HEADERS).send({ name: 'A' });
    const extra = await request(app).post(BASE).set(ADMIN_HEADERS).send({ name: 'Ok', x: 1 });

    expect(short.status).toBe(400);
    expect(extra.status).toBe(400);
  });

  it('deve desativar, listar contagens e calcular os indicadores', async () => {
    const used = await createBrand('rede usada');
    const free = await createBrand('rede livre');
    const group = await createGroup(10, 'Grupo Dez');
    await createStore(group.id, used.id, 1);

    const deactivated = await request(app)
      .patch(`${BASE}/${free.id}`)
      .set(ADMIN_HEADERS)
      .send({ status: 'HISTORICAL' });
    const list = await request(app).get(BASE);
    const stats = await request(app).get(`${BASE}/stats`);

    expect(deactivated.status).toBe(200);
    expect(deactivated.body.status).toBe('HISTORICAL');
    expect(list.body.data[0]).toMatchObject({ id: used.id, storeCount: 1, groupCount: 1 });
    expect(list.body.meta.total).toBe(2);
    expect(stats.body).toEqual({ active: 1, historical: 1, withoutStores: 0 });
  });

  it('deve recusar excluir marca com loja e excluir marca sem loja', async () => {
    const used = await createBrand('rede usada');
    const free = await createBrand('rede livre');
    const group = await createGroup(10, 'Grupo Dez');
    await createStore(group.id, used.id, 1);

    const blocked = await request(app).delete(`${BASE}/${used.id}`).set(ADMIN_HEADERS);
    const removed = await request(app).delete(`${BASE}/${free.id}`).set(ADMIN_HEADERS);
    const list = await request(app).get(BASE);

    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('BRAND_HAS_STORES');
    expect(removed.status).toBe(204);
    expect(list.body.data.map((brand: { id: string }) => brand.id)).toEqual([used.id]);
  });

  it('deve responder 404 para marca inexistente', async () => {
    const response = await request(app)
      .patch(`${BASE}/00000000-0000-4000-8000-000000000000`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Nova' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BRAND_NOT_FOUND');
  });
});
