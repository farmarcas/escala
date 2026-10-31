import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  createGroup,
  makeCnpj,
  ownerDb,
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BASE = '/api/v1/backoffice/partners';

describe('parceiros: indústrias e distribuidores', () => {
  let tenant: Record<string, string>;

  beforeEach(async () => {
    await resetBackoffice();
    tenant = ownerHeaders((await createGroup(101, 'Grupo A')).id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  const createIndustry = (overrides: Record<string, unknown> = {}) =>
    request(app)
      .post(BASE)
      .set(ADMIN_HEADERS)
      .send({
        type: 'INDUSTRY',
        cnpj: makeCnpj('612345670001'),
        legalName: 'Laboratório Exemplo S/A',
        tradeName: 'Lab Exemplo',
        ...overrides,
      });

  it('deve cadastrar, filtrar por tipo e contar nos indicadores', async () => {
    const created = await createIndustry();
    await request(app)
      .post(BASE)
      .set(ADMIN_HEADERS)
      .send({
        type: 'DISTRIBUTOR',
        cnpj: makeCnpj('723456780001'),
        legalName: 'Distribuidora Exemplo Ltda',
        tradeName: 'Dist Exemplo',
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: 'ACTIVE', contactCount: 0, primaryContact: null });
    const industries = await request(app).get(`${BASE}?type=INDUSTRY`).set(ANALYST_HEADERS);
    expect(industries.body.data.map((p: { tradeName: string }) => p.tradeName)).toEqual([
      'Lab Exemplo',
    ]);
    const both = await request(app)
      .get(`${BASE}?type=INDUSTRY,DISTRIBUTOR&status=ACTIVE`)
      .set(ADMIN_HEADERS);
    expect(both.body.meta.total).toBe(2);
    const facets = await request(app)
      .get(`${BASE}/facets?field=type&search=Lab`)
      .set(ANALYST_HEADERS);
    expect(facets.body.data).toEqual([
      { value: 'INDUSTRY', count: 1 },
      { value: 'DISTRIBUTOR', count: 0 },
    ]);
    const stats = await request(app).get(`${BASE}/stats`).set(ADMIN_HEADERS);
    expect(stats.body).toEqual({
      active: 2,
      industries: 1,
      distributors: 1,
      withoutPrimaryContact: 2,
      byType: { all: 2, industry: 1, distributor: 1 },
    });
  });

  it('deve recusar CNPJ inválido ou repetido', async () => {
    await createIndustry();
    const repeated = await createIndustry({ tradeName: 'Outro' });
    const invalid = await createIndustry({ cnpj: '11111111111111' });

    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe('PARTNER_CNPJ_TAKEN');
    expect(invalid.status).toBe(400);
  });

  it('deve manter um só contato principal', async () => {
    const { body: partner } = await createIndustry();
    const first = await request(app)
      .post(`${BASE}/${partner.id}/contacts`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Ana Ramos', jobTitle: 'Gerente de contas', email: 'ana@lab.com.br' });
    expect(first.body.primaryContact).toMatchObject({ name: 'Ana Ramos' });

    const second = await request(app)
      .post(`${BASE}/${partner.id}/contacts`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Bruno Lima', phone: '(11) 98888-7777', isPrimary: true });
    expect(second.body.primaryContact).toMatchObject({ name: 'Bruno Lima' });
    expect(second.body.contacts.filter((c: { isPrimary: boolean }) => c.isPrimary)).toHaveLength(1);

    const bruno = second.body.contacts.find((c: { name: string }) => c.name === 'Bruno Lima');
    const afterRemove = await request(app)
      .delete(`${BASE}/${partner.id}/contacts/${bruno.id}`)
      .set(ADMIN_HEADERS);
    expect(afterRemove.body.primaryContact).toMatchObject({ name: 'Ana Ramos' });
    expect(afterRemove.body.contactCount).toBe(1);
  });

  it('deve recusar contato sem e-mail e sem telefone', async () => {
    const { body: partner } = await createIndustry();
    const response = await request(app)
      .post(`${BASE}/${partner.id}/contacts`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Sem Contato' });

    expect(response.status).toBe(400);
  });

  it('deve inativar com motivo e registrar no histórico', async () => {
    const { body: partner } = await createIndustry();
    const done = await request(app)
      .post(`${BASE}/${partner.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ action: 'inactivate', justification: 'Contrato encerrado' });
    const history = await request(app).get(`${BASE}/${partner.id}/audit-events`).set(ADMIN_HEADERS);

    expect(done.body.status).toBe('INACTIVE');
    expect(history.body.data[0]).toMatchObject({
      action: 'PARTNER_INACTIVATED',
      justification: 'Contrato encerrado',
    });
  });

  it('o analista só consulta e o grupo nunca vê parceiros', async () => {
    const analyst = await createIndustry().set(ANALYST_HEADERS);
    const byTenant = await request(app).get(BASE).set(tenant);

    expect(analyst.status).toBe(403);
    expect(byTenant.status).toBe(403);
  });
});
