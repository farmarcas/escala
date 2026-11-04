import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  MANAGER_HEADERS,
  createBrand,
  createEmployee,
  createGroup,
  createStore,
  makeCnpj,
  ownerDb,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BASE = '/api/v1/backoffice';

// Papéis do Backoffice (spec 005, tabela "No Backoffice"): o gestor opera como o administrador,
// sem funcionários, acessos e Configurações; o analista só consulta.
describe('papéis no Backoffice', () => {
  let angel: { id: string };

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    const group = await createGroup(101, 'Grupo A');
    await createStore(group.id, brand.id, 1);
    angel = await createEmployee('Juliana Prado');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  const operations = (headers: Record<string, string>) => [
    request(app)
      .put(`${BASE}/economic-groups/101/angel`)
      .set(headers)
      .send({ employeeId: angel.id }),
    request(app)
      .post(`${BASE}/partners`)
      .set(headers)
      .send({
        type: 'INDUSTRY',
        cnpj: makeCnpj('612345670001'),
        legalName: 'Laboratório Exemplo S/A',
        tradeName: 'Lab Exemplo',
      }),
    request(app).post(`${BASE}/brands`).set(headers).send({ name: 'Marca Nova' }),
    request(app)
      .patch(`${BASE}/stores/1`)
      .set(headers)
      .send({
        expectedVersion: 1,
        reason: 'Correção do cadastro',
        basic: { tradeName: 'Novo Nome' },
      }),
  ];

  it('o gestor opera grupos, parceiros, marcas e lojas, e vê o proprietário sem máscara', async () => {
    const responses = await Promise.all(operations(MANAGER_HEADERS));
    const group = await request(app).get(`${BASE}/economic-groups/101`).set(MANAGER_HEADERS);
    const history = await request(app).get(`${BASE}/stores/1/history`).set(MANAGER_HEADERS);

    expect(responses.map((response) => response.status)).toEqual([200, 201, 201, 200]);
    expect(group.body.owner.name).toBe('Dona Grupo A');
    expect(JSON.stringify(history.body)).toContain('Gestor da plataforma');
  });

  it('o gestor não mexe em funcionários nem em Configurações', async () => {
    const responses = await Promise.all([
      request(app)
        .post(`${BASE}/employees`)
        .set(MANAGER_HEADERS)
        .send({ name: 'Nova Pessoa', email: 'nova@farmarcas.com.br' }),
      request(app)
        .put(`${BASE}/employees/${angel.id}/accesses/BACKOFFICE`)
        .set(MANAGER_HEADERS)
        .send({ role: 'ADMIN' }),
      request(app).get(`${BASE}/settings/catalog`).set(MANAGER_HEADERS),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403]);
  });

  it('o analista não grava nada de operação e vê o proprietário mascarado', async () => {
    const responses = await Promise.all(operations(ANALYST_HEADERS));
    const group = await request(app).get(`${BASE}/economic-groups/101`).set(ANALYST_HEADERS);
    const admin = await request(app).get(`${BASE}/economic-groups/101`).set(ADMIN_HEADERS);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403]);
    expect(group.body.owner.name).toBeUndefined();
    expect(admin.body.owner.name).toBe('Dona Grupo A');
  });
});
