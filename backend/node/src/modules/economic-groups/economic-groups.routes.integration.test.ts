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

const BASE = '/api/v1/backoffice/economic-groups';

const newGroup = {
  name: 'Grupo Jatobá',
  legalName: 'Jatobá Drogarias Ltda',
  cnpj: makeCnpj('123456780001'),
  owner: { name: 'Ana Souza', email: 'Ana@Exemplo.com.br', phone: '(71) 99999-0000' },
};

describe('economic groups routes', () => {
  beforeEach(resetBackoffice);

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('deve emitir o próximo número do GE ao cadastrar', async () => {
    await createGroup(417, 'Grupo Aurora');

    const response = await request(app).post(BASE).set(ADMIN_HEADERS).send(newGroup);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      number: 418,
      status: 'ACTIVE',
      owner: { name: 'Ana Souza', email: 'ana@exemplo.com.br', phone: '71999990000' },
    });
    expect(response.body.owner.pseudonym).toMatch(/^F-[0-9A-Z]{5}$/);
  });

  it('deve recusar CNPJ inválido e número enviado pelo cliente', async () => {
    const invalid = await request(app)
      .post(BASE)
      .set(ADMIN_HEADERS)
      .send({ ...newGroup, cnpj: '11.111.111/1111-11' });
    const withNumber = await request(app)
      .post(BASE)
      .set(ADMIN_HEADERS)
      .send({ ...newGroup, number: 1 });

    expect(invalid.status).toBe(400);
    expect(withNumber.status).toBe(400);
  });

  it('deve filtrar por status, UF, marca e busca', async () => {
    const aurora = await createBrand('rede aurora');
    const sul = await createBrand('popular sul');
    const a = await createGroup(417, 'Grupo Aurora');
    const b = await createGroup(301, 'Grupo Ponte Alta', { status: 'SUSPENDED' });
    await createStore(a.id, aurora.id, 1, { uf: 'SP' });
    await createStore(a.id, sul.id, 2, { uf: 'MG', type: 'CD' });
    await createStore(b.id, sul.id, 3, { uf: 'CE' });

    const numbers = async (query: string) =>
      (await request(app).get(`${BASE}?${query}`)).body.data.map(
        (group: { number: number }) => group.number,
      );

    expect(await numbers('')).toEqual([301, 417]);
    expect(await numbers('status=SUSPENDED')).toEqual([301]);
    expect(await numbers('uf=MG')).toEqual([417]);
    expect(await numbers(`brandId=${sul.id}`)).toEqual([301, 417]);
    expect(await numbers(`brandId=${aurora.id}`)).toEqual([417]);
    expect(await numbers('search=ponte')).toEqual([301]);
    expect(await numbers('search=417')).toEqual([417]);

    const list = await request(app).get(`${BASE}?search=aurora`);
    expect(list.body.data[0]).toMatchObject({
      storeCount: 2,
      pdvCount: 1,
      cdCount: 1,
      brands: ['popular sul', 'rede aurora'],
      ufs: ['MG', 'SP'],
    });
  });

  it('deve mostrar o detalhe, auditar a consulta do admin e responder 404', async () => {
    await createGroup(417, 'Grupo Aurora');
    await createGroup(66, 'Grupo Ipê', { owner: false });

    const detail = await request(app).get(`${BASE}/417`).set(ADMIN_HEADERS);
    await request(app).get(`${BASE}/417`).set(ADMIN_HEADERS);
    const noOwner = await request(app).get(`${BASE}/66`).set(ADMIN_HEADERS);
    const missing = await request(app).get(`${BASE}/9999`).set(ADMIN_HEADERS);

    expect(detail.status).toBe(200);
    expect(detail.body.owner.name).toBe('Dona Grupo Aurora');
    expect(await ownerDb.auditEvent.count({ where: { action: 'OWNER_VIEWED' } })).toBe(1);
    expect(noOwner.body.badges).toEqual(['NO_OWNER', 'NO_ANGEL']);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('GROUP_NOT_FOUND');
  });

  it('deve editar o grupo e cadastrar proprietário que faltava', async () => {
    await createGroup(66, 'Grupo Ipê', { owner: false });

    const response = await request(app)
      .patch(`${BASE}/66`)
      .set(ADMIN_HEADERS)
      .send({ name: 'Grupo Ipê Sul', owner: newGroup.owner });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      number: 66,
      name: 'Grupo Ipê Sul',
      badges: ['NO_ANGEL'],
    });
    expect(response.body.owner.pseudonym).toMatch(/^F-/);
  });

  it('deve suspender e restaurar com justificativa e listar a auditoria', async () => {
    await createGroup(417, 'Grupo Aurora');

    const empty = await request(app)
      .post(`${BASE}/417/status-changes`)
      .set(ADMIN_HEADERS)
      .send({ action: 'suspend', justification: '   ' });
    const suspended = await request(app)
      .post(`${BASE}/417/status-changes`)
      .set(ADMIN_HEADERS)
      .send({ action: 'suspend', justification: 'Pedido do associado' });
    const invalid = await request(app)
      .post(`${BASE}/417/status-changes`)
      .set(ADMIN_HEADERS)
      .send({ action: 'suspend', justification: 'De novo' });
    const restored = await request(app)
      .post(`${BASE}/417/status-changes`)
      .set(ADMIN_HEADERS)
      .send({ action: 'restore', justification: 'Revisão concluída' });
    const audit = await request(app).get(`${BASE}/417/audit-events`);

    expect(empty.status).toBe(400);
    expect(suspended.body.status).toBe('SUSPENDED');
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(restored.body.status).toBe('ACTIVE');
    expect(audit.body.data.map((event: { action: string }) => event.action)).toEqual([
      'GROUP_RESTORED',
      'GROUP_SUSPENDED',
    ]);
    expect(audit.body.data[1]).toMatchObject({
      justification: 'Pedido do associado',
      actorSubject: 'OP-02',
      actorRole: 'PLATFORM_ADMIN',
    });
  });

  it('deve calcular os indicadores do cadastro', async () => {
    const brandA = await createBrand('marca a');
    const brandB = await createBrand('marca b');
    const a = await createGroup(1, 'Grupo Um');
    await createGroup(2, 'Grupo Dois', { status: 'ARCHIVED', owner: false });
    await createStore(a.id, brandA.id, 1, { uf: 'SP' });
    await createStore(a.id, brandB.id, 2, { uf: 'RJ', type: 'CD' });
    await ownerDb.store.update({
      where: { code: 1 },
      data: { createdAt: new Date('2020-01-01T12:00:00.000Z') },
    });

    const stats = await request(app).get(`${BASE}/stats`);
    const list = await request(app).get(BASE);

    expect(stats.body).toEqual({
      byStatus: { all: 2, active: 1, suspended: 0, archived: 1 },
      stores: { total: 2, pdv: 1, cd: 1 },
      ufCount: 2,
      withOwner: 1,
      multiBrand: 1,
      groupsWithCd: 1,
      outdated: 1,
      bySize: [
        { size: 'none', groups: 1, withOwner: 0 },
        { size: 'one', groups: 0, withOwner: 0 },
        { size: 'small', groups: 1, withOwner: 1 },
        { size: 'medium', groups: 0, withOwner: 0 },
        { size: 'large', groups: 0, withOwner: 0 },
      ],
      byUf: [
        { uf: 'RJ', stores: 1, groups: 1 },
        { uf: 'SP', stores: 1, groups: 1 },
      ],
    });
    expect(list.body.data[0]).toMatchObject({
      outdatedStores: 1,
      badges: ['NO_ANGEL', 'OUTDATED_STORES'],
    });
  });
});
