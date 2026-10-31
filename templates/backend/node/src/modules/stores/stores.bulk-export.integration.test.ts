import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  createBrand,
  createGroup,
  createStore,
  ownerDb,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BO = '/api/v1/backoffice';

describe('lote e exportação', () => {
  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    const groupA = await createGroup(101, 'Grupo A');
    const groupB = await createGroup(202, 'Grupo B');
    await createStore(groupA.id, brand.id, 1, { uf: 'SP' });
    await createStore(groupA.id, brand.id, 2, { uf: 'SP' });
    await createStore(groupB.id, brand.id, 3, { uf: 'MG' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('deve bloquear em lote, pular as já bloqueadas e auditar cada grupo', async () => {
    await request(app)
      .post(`${BO}/stores/1/block`)
      .set(ADMIN_HEADERS)
      .send({ justification: 'Antes' });

    const result = await request(app)
      .post(`${BO}/stores/bulk`)
      .set(ADMIN_HEADERS)
      .send({ action: 'BLOCK', codes: [1, 2, 3, 99], justification: 'Pendência financeira' });
    const auditA = await request(app)
      .get(`${BO}/economic-groups/101/audit-events`)
      .set(ADMIN_HEADERS);
    const auditB = await request(app)
      .get(`${BO}/economic-groups/202/audit-events`)
      .set(ADMIN_HEADERS);

    expect(result.body).toEqual({ changed: 2, skipped: 2 });
    expect(auditA.body.data[0]).toMatchObject({
      action: 'STORE_BLOCKED',
      justification: 'Pendência financeira',
    });
    expect(auditB.body.data[0]).toMatchObject({ action: 'STORE_BLOCKED' });
  });

  it('deve cobrar em lote, pular as validadas e registrar no histórico da loja', async () => {
    await ownerDb.store.update({ where: { code: 3 }, data: { validatedAt: new Date() } });

    const result = await request(app)
      .post(`${BO}/stores/bulk`)
      .set(ADMIN_HEADERS)
      .send({ action: 'REMIND', codes: [1, 2, 3] });
    const history = await ownerDb.storeHistory.findMany({
      where: { kind: 'REMINDER' },
      select: { storeId: true },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ changed: 2, skipped: 1 });
    expect(history).toHaveLength(2);
  });

  it('bloquear em lote ainda exige motivo; cobrar não', async () => {
    const response = await request(app)
      .post(`${BO}/stores/bulk`)
      .set(ADMIN_HEADERS)
      .send({ action: 'BLOCK', codes: [1] });

    expect(response.status).toBe(400);
  });

  it('deve filtrar por vários valores do mesmo campo', async () => {
    const both = await request(app).get(`${BO}/stores?uf=SP,MG`).set(ADMIN_HEADERS);
    const one = await request(app).get(`${BO}/stores?uf=MG`).set(ADMIN_HEADERS);
    const invalid = await request(app).get(`${BO}/stores?status=XX`).set(ADMIN_HEADERS);

    expect(both.body.meta.total).toBe(3);
    expect(one.body.meta.total).toBe(1);
    expect(invalid.status).toBe(400);
  });

  it('deve contar as lojas de cada valor considerando os outros filtros', async () => {
    const all = await request(app).get(`${BO}/stores/facets?field=uf`).set(ADMIN_HEADERS);
    const groupA = await request(app)
      .get(`${BO}/stores/facets?field=uf&search=101`)
      .set(ADMIN_HEADERS);

    expect(all.status).toBe(200);
    expect(all.body.data).toEqual([
      { value: 'MG', count: 1 },
      { value: 'SP', count: 2 },
    ]);
    expect(groupA.body.data).toContainEqual({ value: 'MG', count: 0 });
  });

  it('o analista não faz ação em lote', async () => {
    const response = await request(app)
      .post(`${BO}/stores/bulk`)
      .set(ANALYST_HEADERS)
      .send({ action: 'BLOCK', codes: [1], justification: 'Motivo' });

    expect(response.status).toBe(403);
  });

  it('deve exportar só as linhas filtradas, com BOM e ;', async () => {
    const response = await request(app).get(`${BO}/stores/export?uf=SP`).set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(/attachment; filename="lojas-/);
    const lines = response.text.split('\r\n').filter(Boolean);
    expect(lines[0]?.startsWith('﻿GE;Grupo;Código')).toBe(true);
    expect(lines).toHaveLength(3);
  });

  it('o CSV de grupos do analista não traz dado pessoal do proprietário', async () => {
    const asAdmin = await request(app).get(`${BO}/economic-groups/export`).set(ADMIN_HEADERS);
    const asAnalyst = await request(app).get(`${BO}/economic-groups/export`).set(ANALYST_HEADERS);

    expect(asAdmin.text).toContain('Dona Grupo A');
    expect(asAnalyst.text).not.toMatch(/Dona Grupo A|dona101@exemplo|11900000000/);
    expect(asAnalyst.text).toContain('F-00101;Pseudonimizado');
  });

  it('deve exportar funcionários e parceiros', async () => {
    const employees = await request(app).get(`${BO}/employees/export`).set(ADMIN_HEADERS);
    const partners = await request(app).get(`${BO}/partners/export`).set(ADMIN_HEADERS);

    expect(employees.text.startsWith('﻿Nome;E-mail')).toBe(true);
    expect(partners.text.startsWith('﻿Parceiro;Razão social')).toBe(true);
  });
});
