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
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';

type UfBody = { uf: string; stores: number; groups: number };

describe('início · mapa da rede', () => {
  let tenant: Record<string, string>;

  beforeEach(async () => {
    await resetBackoffice();
    const aurora = (await createBrand('Rede Aurora')).id;
    const vitta = (await createBrand('Vitta Popular')).id;
    const g1 = await createGroup(1, 'Grupo Um');
    const g2 = await createGroup(2, 'Grupo Dois', { owner: false });
    const g3 = await createGroup(3, 'Grupo Arquivado', { status: 'ARCHIVED' });
    tenant = ownerHeaders(g1.id);

    // Grupo Um: 3 lojas em SP (2 em Campinas) e 1 em MG.
    await createStore(g1.id, aurora, 1, { uf: 'SP', city: 'Campinas' });
    await createStore(g1.id, aurora, 2, { uf: 'SP', city: 'Campinas' });
    await createStore(g1.id, vitta, 3, { uf: 'SP', city: 'São Paulo' });
    await createStore(g1.id, vitta, 4, { uf: 'MG', city: 'Juiz de Fora' });
    // Grupo Dois: 1 loja em SP e 1 inativa em MG (não entra).
    await createStore(g2.id, vitta, 5, { uf: 'SP', city: 'São Paulo' });
    const inactive = await createStore(g2.id, vitta, 6, { uf: 'MG', city: 'Muriaé' });
    await ownerDb.store.update({ where: { id: inactive.id }, data: { status: 'INACTIVE' } });
    // Grupo arquivado: não entra.
    await createStore(g3.id, aurora, 7, { uf: 'RJ', city: 'Niterói' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('conta lojas e grupos da rede em operação, por estado', async () => {
    const response = await request(app).get('/api/v1/backoffice/home/map').set(ADMIN_HEADERS);

    expect(response.status).toBe(200);
    // Grupo com lojas em 2 estados conta uma vez no Brasil.
    expect(response.body.totals).toEqual({ stores: 5, groups: 2, groupsWithOwner: 1 });
    // Grupo Um tem lojas em SP e MG: conta uma vez no Sudeste.
    expect(response.body.regions).toEqual([
      { region: 'SE', stores: 5, groups: 2, groupsWithOwner: 1 },
    ]);
    expect(response.body.ufs.map((u: UfBody) => u.uf)).toEqual(['SP', 'MG']);

    const sp = response.body.ufs[0];
    expect(sp).toEqual({
      uf: 'SP',
      stores: 4,
      groups: 2,
      groupsWithOwner: 1,
      cities: 2,
      topCities: [
        { city: 'Campinas', stores: 2 },
        { city: 'São Paulo', stores: 2 },
      ],
      brands: [
        { name: 'Rede Aurora', stores: 2 },
        { name: 'Vitta Popular', stores: 2 },
      ],
      topGroups: [
        { number: 1, name: 'Grupo Um', stores: 3 },
        { number: 2, name: 'Grupo Dois', stores: 1 },
      ],
    });
    expect(response.body.ufs[1]).toMatchObject({ uf: 'MG', stores: 1, groups: 1, cities: 1 });
  });

  it('bate com a lista de lojas em operação filtrada pelo estado', async () => {
    const map = await request(app).get('/api/v1/backoffice/home/map').set(ADMIN_HEADERS);
    const total = async (query: string) =>
      (await request(app).get(`/api/v1/backoffice/stores?${query}`).set(ADMIN_HEADERS)).body.meta
        .total as number;

    for (const presence of map.body.ufs as UfBody[]) {
      expect(await total(`uf=${presence.uf}&status=OPERATING`)).toBe(presence.stores);
    }
    // Em MG há uma loja inativa: a lista sem filtro mostra 2, a rede em operação conta 1.
    expect(await total('uf=MG')).toBe(2);
    expect(await total('status=OPERATING')).toBe(map.body.totals.stores);
  });

  it('entrega os mesmos números ao analista e recusa o grupo', async () => {
    const asAdmin = await request(app).get('/api/v1/backoffice/home/map').set(ADMIN_HEADERS);
    const asAnalyst = await request(app).get('/api/v1/backoffice/home/map').set(ANALYST_HEADERS);
    const asTenant = await request(app).get('/api/v1/backoffice/home/map').set(tenant);

    expect(asAnalyst.status).toBe(200);
    expect(asAnalyst.body).toEqual(asAdmin.body);
    expect(asTenant.status).toBe(403);
  });
});
