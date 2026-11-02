import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  MANAGER_HEADERS,
  catalogEntry,
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
  let trade: { id: string };
  let analyst: { id: string };
  let coordinator: { id: string };
  let bruno: { id: string };

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    trade = await catalogEntry('DEPARTMENT', 'Trade');
    analyst = await catalogEntry('OCCUPATION', 'Analista de relacionamento');
    coordinator = await catalogEntry('OCCUPATION', 'Coordenadora de relacionamento');
    bruno = await createEmployee('Bruno Castro', {
      access: [{ system: 'BACKOFFICE', role: 'ADMIN' }],
    });
    juliana = await createEmployee('Juliana Prado', {
      access: [{ system: 'BACKOFFICE', role: 'ANALYST' }],
    });
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
      .get(`${BASE}/employees/facets?field=status&search=a`)
      .set(ANALYST_HEADERS);

    expect(both.body.meta.total).toBe(4);
    expect(facets.body.data).toEqual([
      { value: 'ACTIVE', count: 3 },
      { value: 'TERMINATED', count: 1 },
    ]);
  });

  it('deve cadastrar, editar e listar funcionários, com histórico', async () => {
    const created = await request(app).post(`${BASE}/employees`).set(ADMIN_HEADERS).send({
      name: 'Marília Duarte',
      email: 'Marilia.Duarte@farmarcas.com.br',
      gender: 'FEMALE',
      mobile: '(11) 9 6034-8829',
      landline: '',
      departmentId: trade.id,
      occupationId: analyst.id,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      email: 'marilia.duarte@farmarcas.com.br',
      mobile: '11960348829',
      landline: null,
      department: { name: 'Trade', active: true },
      occupation: { name: 'Analista de relacionamento' },
      status: 'ACTIVE',
      accesses: [],
      version: 1,
      portfolioCount: 0,
    });

    const edited = await request(app)
      .patch(`${BASE}/employees/${created.body.id}`)
      .set(ADMIN_HEADERS)
      .send({ version: 1, occupationId: coordinator.id, landline: '(11) 3045-0000' });
    const stale = await request(app)
      .patch(`${BASE}/employees/${created.body.id}`)
      .set(ADMIN_HEADERS)
      .send({ version: 1, name: 'Marília D.' });
    expect(edited.body).toMatchObject({
      occupation: { name: 'Coordenadora de relacionamento' },
      landline: '1130450000',
      version: 2,
    });
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');

    const list = await request(app)
      .get(`${BASE}/employees?search=coordenadora`)
      .set(ANALYST_HEADERS);
    expect(list.body.meta.total).toBe(1);

    const history = await request(app)
      .get(`${BASE}/employees/${created.body.id}/audit-events`)
      .set(ADMIN_HEADERS);
    expect(history.body.data.map((event: { summary: string }) => event.summary)).toEqual([
      'Telefone fixo: (vazio) → (11) 3045-0000; Ocupação: Analista de relacionamento → Coordenadora de relacionamento',
      'Funcionário Marília Duarte cadastrado',
    ]);
  });

  it('deve recusar e-mail repetido, celular inválido e ocupação desativada nova', async () => {
    const body = {
      name: 'Outra Juliana',
      email: 'JULIANA.PRADO@farmarcas.com.br',
      mobile: '11900000001',
      departmentId: trade.id,
      occupationId: analyst.id,
    };
    const duplicate = await request(app).post(`${BASE}/employees`).set(ADMIN_HEADERS).send(body);
    const badMobile = await request(app)
      .post(`${BASE}/employees`)
      .set(ADMIN_HEADERS)
      .send({ ...body, email: 'nova@farmarcas.com.br', mobile: '1190000000' });
    await ownerDb.catalogItem.update({ where: { id: coordinator.id }, data: { active: false } });
    const inactive = await request(app)
      .patch(`${BASE}/employees/${juliana.id}`)
      .set(ADMIN_HEADERS)
      .send({ version: 1, occupationId: coordinator.id });
    const options = await request(app).get(`${BASE}/employees/options`).set(ANALYST_HEADERS);

    expect(duplicate.body.error.code).toBe('EMPLOYEE_EMAIL_TAKEN');
    expect(badMobile.status).toBe(400);
    expect(inactive.body.error.code).toBe('CATALOG_ITEM_INACTIVE');
    expect(options.body.occupations.map((item: { name: string }) => item.name)).toEqual([
      'Analista de relacionamento',
    ]);
    expect(options.body.systems.map((item: { system: string }) => item.system)).toEqual([
      'BACKOFFICE',
      'GESTAO_360',
      'ESCALA',
    ]);
  });

  it('gestor e analista só consultam funcionários', async () => {
    const responses = await Promise.all(
      [MANAGER_HEADERS, ANALYST_HEADERS].flatMap((headers) => [
        request(app)
          .patch(`${BASE}/employees/${juliana.id}`)
          .set(headers)
          .send({ version: 1, name: 'Outro' }),
        request(app)
          .put(`${BASE}/employees/${juliana.id}/accesses/BACKOFFICE`)
          .set(headers)
          .send({ role: 'ADMIN' }),
      ]),
    );
    const read = await request(app).get(`${BASE}/employees/${juliana.id}`).set(MANAGER_HEADERS);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403]);
    expect(read.status).toBe(200);
  });

  it('dá, troca e tira acesso por sistema, com histórico e filtro', async () => {
    const path = (system: string) => `${BASE}/employees/${juliana.id}/accesses/${system}`;
    await request(app).put(path('GESTAO_360')).set(ADMIN_HEADERS).send({ role: 'ANALYST' });
    const changed = await request(app)
      .put(path('BACKOFFICE'))
      .set(ADMIN_HEADERS)
      .send({ role: 'MANAGER' });
    const same = await request(app)
      .put(path('BACKOFFICE'))
      .set(ADMIN_HEADERS)
      .send({ role: 'MANAGER' });
    const managers = await request(app)
      .get(`${BASE}/employees?access=BACKOFFICE:MANAGER`)
      .set(ADMIN_HEADERS);
    const none = await request(app).get(`${BASE}/employees?access=NONE`).set(ADMIN_HEADERS);
    await request(app).put(path('GESTAO_360')).set(ADMIN_HEADERS).send({ role: null });
    const detail = await request(app).get(`${BASE}/employees/${juliana.id}`).set(ADMIN_HEADERS);
    const history = await request(app)
      .get(`${BASE}/employees/${juliana.id}/audit-events`)
      .set(ADMIN_HEADERS);
    const stats = await request(app).get(`${BASE}/employees/stats`).set(ADMIN_HEADERS);

    expect(changed.body.accesses).toEqual([
      expect.objectContaining({ system: 'GESTAO_360', role: 'ANALYST' }),
      expect.objectContaining({ system: 'BACKOFFICE', role: 'MANAGER', grantedBy: 'OP-02' }),
    ]);
    expect(same.status).toBe(200);
    expect(managers.body.data.map((row: { name: string }) => row.name)).toEqual(['Juliana Prado']);
    expect(none.body.data.map((row: { name: string }) => row.name)).toEqual(['Isabela Nunes']);
    expect(detail.body.accesses).toEqual([
      expect.objectContaining({ system: 'BACKOFFICE', role: 'MANAGER' }),
    ]);
    expect(history.body.data.map((event: { summary: string }) => event.summary)).toEqual([
      'Gestão 360: Analista → sem acesso',
      'Backoffice: Analista → Gestor',
      'Gestão 360: sem acesso → Analista',
    ]);
    expect(stats.body.admins).toBe(1);
  });

  it('o Backoffice nunca fica sem administrador; desligar encerra os acessos', async () => {
    const demote = await request(app)
      .put(`${BASE}/employees/${bruno.id}/accesses/BACKOFFICE`)
      .set(ADMIN_HEADERS)
      .send({ role: 'MANAGER' });
    const terminateLast = await request(app)
      .post(`${BASE}/employees/${bruno.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ action: 'terminate', justification: 'Saiu da empresa' });
    await request(app)
      .put(`${BASE}/employees/${juliana.id}/accesses/BACKOFFICE`)
      .set(ADMIN_HEADERS)
      .send({ role: 'ADMIN' });
    const terminated = await request(app)
      .post(`${BASE}/employees/${bruno.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ action: 'terminate', justification: 'Saiu da empresa' });
    const grantTerminated = await request(app)
      .put(`${BASE}/employees/${bruno.id}/accesses/ESCALA`)
      .set(ADMIN_HEADERS)
      .send({ role: 'ANALYST' });
    const rehired = await request(app)
      .post(`${BASE}/employees/${bruno.id}/status`)
      .set(ADMIN_HEADERS)
      .send({ action: 'rehire', justification: 'Voltou para a empresa' });

    expect(demote.body.error.code).toBe('LAST_ADMIN');
    expect(terminateLast.body.error.code).toBe('LAST_ADMIN');
    expect(terminated.body.status).toBe('TERMINATED');
    expect(terminated.body.accesses).toEqual([
      expect.objectContaining({
        system: 'BACKOFFICE',
        role: 'ADMIN',
        revokedAt: expect.any(String),
      }),
    ]);
    expect(grantTerminated.body.error.code).toBe('EMPLOYEE_TERMINATED');
    expect(rehired.body).toMatchObject({ status: 'ACTIVE', accesses: [] });
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
