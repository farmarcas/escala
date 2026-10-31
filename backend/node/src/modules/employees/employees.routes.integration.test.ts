import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  createBrand,
  createEmployee,
  createGroup,
  createStore,
  ownerDb,
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BASE = '/api/v1/backoffice';

describe('funcionários da Farmarcas e Anjo do grupo', () => {
  let juliana: { id: string };
  let isabela: { id: string };
  let groupA: { id: string };
  let groupB: { id: string };

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    juliana = await createEmployee('Juliana Prado');
    isabela = await createEmployee('Isabela Nunes');
    groupA = await createGroup(101, 'Grupo A');
    groupB = await createGroup(202, 'Grupo B');
    await createGroup(303, 'Grupo Arquivado', { status: 'ARCHIVED' });
    await createStore(groupA.id, brand.id, 1);
    await createStore(groupB.id, brand.id, 2);
    await ownerDb.economicGroup.update({
      where: { id: groupB.id },
      data: { angelEmployeeId: isabela.id },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('deve filtrar por vários valores e contar cada um', async () => {
    await createEmployee('Paula Reis', { status: 'TERMINATED' });

    const both = await request(app)
      .get(`${BASE}/employees?status=ACTIVE,TERMINATED`)
      .set(ADMIN_HEADERS);
    const facets = await request(app)
      .get(`${BASE}/employees/facets?field=status&area=MEMBER_SUCCESS`)
      .set(ANALYST_HEADERS);

    expect(both.body.meta.total).toBe(3);
    expect(facets.body.data).toEqual([
      { value: 'ACTIVE', count: 2 },
      { value: 'TERMINATED', count: 1 },
    ]);
  });

  it('deve cadastrar, editar e listar funcionários, com histórico', async () => {
    const created = await request(app).post(`${BASE}/employees`).set(ADMIN_HEADERS).send({
      name: 'Marília Duarte',
      email: 'Marilia.Duarte@farmarcas.com.br',
      phone: '(11) 90000-7781',
      area: 'MEMBER_SUCCESS',
      jobTitle: 'Analista de relacionamento',
      accessRole: 'PLATFORM_ANALYST',
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      email: 'marilia.duarte@farmarcas.com.br',
      phone: '11900007781',
      status: 'ACTIVE',
      portfolioCount: 0,
    });

    const edited = await request(app)
      .patch(`${BASE}/employees/${created.body.id}`)
      .set(ADMIN_HEADERS)
      .send({ jobTitle: 'Coordenadora de relacionamento' });
    expect(edited.body.jobTitle).toBe('Coordenadora de relacionamento');

    const list = await request(app)
      .get(`${BASE}/employees?search=mar%C3%ADlia`)
      .set(ANALYST_HEADERS);
    expect(list.body.meta.total).toBe(1);

    const history = await request(app)
      .get(`${BASE}/employees/${created.body.id}/audit-events`)
      .set(ADMIN_HEADERS);
    expect(history.body.data.map((event: { action: string }) => event.action)).toEqual([
      'EMPLOYEE_UPDATED',
      'EMPLOYEE_CREATED',
    ]);
  });

  it('deve recusar e-mail repetido, sem diferenciar maiúsculas', async () => {
    const response = await request(app).post(`${BASE}/employees`).set(ADMIN_HEADERS).send({
      name: 'Outra Juliana',
      email: 'JULIANA.PRADO@farmarcas.com.br',
      area: 'TRADE',
      jobTitle: 'Analista',
      accessRole: 'NONE',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMPLOYEE_EMAIL_TAKEN');
  });

  it('o analista só consulta', async () => {
    const response = await request(app)
      .patch(`${BASE}/employees/${juliana.id}`)
      .set(ANALYST_HEADERS)
      .send({ jobTitle: 'Outro' });

    expect(response.status).toBe(403);
  });

  it('não deve desligar quem é Anjo de grupo em operação', async () => {
    const refused = await request(app)
      .post(`${BASE}/employees/${isabela.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ action: 'terminate', justification: 'Saiu da empresa' });
    const done = await request(app)
      .post(`${BASE}/employees/${juliana.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ action: 'terminate', justification: 'Saiu da empresa' });

    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('EMPLOYEE_HAS_PORTFOLIO');
    expect(done.body).toMatchObject({ status: 'TERMINATED' });
    expect(done.body.terminatedAt).not.toBeNull();
  });

  it('deve definir e trocar o Anjo, com auditoria do grupo', async () => {
    const defined = await request(app)
      .put(`${BASE}/economic-groups/101/angel`)
      .set(ADMIN_HEADERS)
      .send({ employeeId: juliana.id });
    expect(defined.status).toBe(200);
    expect(defined.body.angel).toMatchObject({ name: 'Juliana Prado' });
    expect(defined.body.badges).not.toContain('NO_ANGEL');

    await request(app)
      .put(`${BASE}/economic-groups/101/angel`)
      .set(ADMIN_HEADERS)
      .send({ employeeId: isabela.id });
    const audit = await request(app)
      .get(`${BASE}/economic-groups/101/audit-events`)
      .set(ADMIN_HEADERS);
    expect(audit.body.data[0]).toMatchObject({
      action: 'ANGEL_CHANGED',
      summary: 'Anjo trocado de Juliana Prado para Isabela Nunes',
    });

    const detail = await request(app).get(`${BASE}/employees/${isabela.id}`).set(ADMIN_HEADERS);
    expect(detail.body.portfolio.map((group: { number: number }) => group.number)).toEqual([
      101, 202,
    ]);
  });

  it('deve recusar Anjo desligado e grupo arquivado', async () => {
    const terminated = await createEmployee('Pessoa Desligada', { status: 'TERMINATED' });

    const byEmployee = await request(app)
      .put(`${BASE}/economic-groups/101/angel`)
      .set(ADMIN_HEADERS)
      .send({ employeeId: terminated.id });
    const byGroup = await request(app)
      .put(`${BASE}/economic-groups/303/angel`)
      .set(ADMIN_HEADERS)
      .send({ employeeId: juliana.id });

    expect(byEmployee.body.error.code).toBe('EMPLOYEE_NOT_ACTIVE');
    expect(byGroup.body.error.code).toBe('GROUP_ARCHIVED');
  });

  it('deve atribuir em lote e dizer quantas foram puladas', async () => {
    const response = await request(app)
      .post(`${BASE}/economic-groups/bulk-angel`)
      .set(ADMIN_HEADERS)
      .send({ numbers: [101, 202, 303, 999], employeeId: isabela.id });

    expect(response.body).toEqual({ changed: 1, skipped: 3 });
  });

  it('deve filtrar grupos e lojas pelo Anjo e mostrar o Anjo na loja', async () => {
    const groups = await request(app)
      .get(`${BASE}/economic-groups?angelId=${isabela.id}`)
      .set(ADMIN_HEADERS);
    const withoutAngel = await request(app)
      .get(`${BASE}/economic-groups?withoutAngel=true`)
      .set(ADMIN_HEADERS);
    const stores = await request(app)
      .get(`${BASE}/stores?angelId=${isabela.id}`)
      .set(ADMIN_HEADERS);
    const page = await request(app).get(`${BASE}/stores/2`).set(ADMIN_HEADERS);

    expect(groups.body.data.map((group: { number: number }) => group.number)).toEqual([202]);
    // O arquivado (303) não entra: não precisa de Anjo.
    expect(withoutAngel.body.data.map((group: { number: number }) => group.number)).toEqual([101]);
    expect(stores.body.data.map((store: { code: number }) => store.code)).toEqual([2]);
    expect(stores.body.data[0].angel).toMatchObject({ name: 'Isabela Nunes' });
    expect(page.body.angel).toMatchObject({ name: 'Isabela Nunes' });
  });

  it('o grupo vê só o próprio Anjo e nunca a lista de funcionários', async () => {
    const tenantB = ownerHeaders(groupB.id);
    const tenantA = ownerHeaders(groupA.id);

    const ownPage = await request(app).get('/api/v1/tenant/stores/2').set(tenantB);
    const otherPage = await request(app).get('/api/v1/tenant/stores/1').set(tenantA);
    const list = await request(app).get(`${BASE}/employees`).set(tenantB);

    expect(ownPage.body.angel).toMatchObject({ name: 'Isabela Nunes' });
    expect(otherPage.body.angel).toBeNull();
    expect(list.status).toBe(403);
  });
});
