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

const BASE = '/api/v1/backoffice/stores';

describe('lojas · etapa e bloqueio', () => {
  let tenant: Record<string, string>;
  let storeId: string;

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    const group = await createGroup(101, 'Grupo A');
    tenant = ownerHeaders(group.id);
    storeId = (await createStore(group.id, brand.id, 1)).id;
    await createStore(group.id, brand.id, 2);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('deve avançar a etapa, pedir a data para inaugurar e justificativa para voltar', async () => {
    const setup = await request(app)
      .patch(`${BASE}/1/stage`)
      .set(ADMIN_HEADERS)
      .send({ stage: 'SETUP' });
    const noDate = await request(app)
      .patch(`${BASE}/1/stage`)
      .set(ADMIN_HEADERS)
      .send({ stage: 'OPENED' });
    const opened = await request(app)
      .patch(`${BASE}/1/stage`)
      .set(ADMIN_HEADERS)
      .send({ stage: 'OPENED', openedAt: '2026-10-20' });
    const backWithout = await request(app)
      .patch(`${BASE}/1/stage`)
      .set(ADMIN_HEADERS)
      .send({ stage: 'SETUP' });

    expect(setup.body.stage).toBe('SETUP');
    expect(noDate.status).toBe(400);
    expect(opened.body).toMatchObject({ stage: 'OPENED', openedAt: '2026-10-20' });
    expect(backWithout.status).toBe(400);

    const history = await request(app).get(`${BASE}/1/history`).set(ADMIN_HEADERS);
    expect(history.body.data[0]).toMatchObject({ fieldLabel: 'Etapa', newValue: 'Inaugurada' });
  });

  it('loja bloqueada some para o grupo e volta depois do desbloqueio', async () => {
    const blocked = await request(app)
      .post(`${BASE}/1/block`)
      .set(ADMIN_HEADERS)
      .send({ justification: 'Pendência financeira' });
    expect(blocked.body).toMatchObject({ isBlocked: true, blockedReason: 'Pendência financeira' });

    const read = await request(app).get('/api/v1/tenant/stores/1').set(tenant);
    const write = await request(app)
      .patch('/api/v1/tenant/stores/1')
      .set(tenant)
      .send({ expectedVersion: 1, basic: { phone1: '1130004100' } });
    const other = await request(app).get('/api/v1/tenant/stores/2').set(tenant);
    const mine = await request(app).get('/api/v1/tenant/stores').set(tenant);
    const platform = await request(app).get(`${BASE}/1`).set(ADMIN_HEADERS);

    expect(read.status).toBe(403);
    expect(read.body.error.code).toBe('STORE_BLOCKED');
    expect(write.status).toBe(403);
    expect(other.status).toBe(200);
    expect(mine.body.data.find((s: { code: number }) => s.code === 1).isBlocked).toBe(true);
    expect(platform.body.block).toMatchObject({ reason: 'Pendência financeira' });

    await request(app)
      .post(`${BASE}/1/unblock`)
      .set(ADMIN_HEADERS)
      .send({ justification: 'Pendência resolvida' });
    const back = await request(app).get('/api/v1/tenant/stores/1').set(tenant);
    expect(back.status).toBe(200);

    const audit = await request(app)
      .get('/api/v1/backoffice/economic-groups/101/audit-events')
      .set(ADMIN_HEADERS);
    expect(audit.body.data.map((e: { action: string }) => e.action).slice(0, 2)).toEqual([
      'STORE_UNBLOCKED',
      'STORE_BLOCKED',
    ]);
  });

  it('deve filtrar por etapa, bloqueio e cadastro desatualizado', async () => {
    await ownerDb.store.update({
      where: { id: storeId },
      data: { blockedAt: new Date(), blockedReason: 'x', blockedBy: 'OP-02' },
    });
    await ownerDb.$executeRawUnsafe(
      `UPDATE stores SET updated_at = now() - interval '120 days', created_at = now() - interval '200 days' WHERE code = 2`,
    );

    const blocked = await request(app).get(`${BASE}?blocked=true`).set(ADMIN_HEADERS);
    const prospecting = await request(app).get(`${BASE}?stage=PROSPECTING`).set(ADMIN_HEADERS);
    const outdated = await request(app).get(`${BASE}?outdated=true`).set(ADMIN_HEADERS);

    expect(blocked.body.data.map((s: { code: number }) => s.code)).toEqual([1]);
    expect(prospecting.body.meta.total).toBe(2);
    expect(outdated.body.data.map((s: { code: number }) => s.code)).toEqual([2]);
    expect(outdated.body.data[0].isOutdated).toBe(true);
  });
});
