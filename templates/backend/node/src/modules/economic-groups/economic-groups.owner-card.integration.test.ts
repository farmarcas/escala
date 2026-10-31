import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import { withActor } from '../../shared/database/with-actor.js';
import {
  ADMIN_HEADERS,
  ANALYST_HEADERS,
  createBrand,
  createGroup,
  createStore,
  ownerDb,
  resetBackoffice,
} from '../../test-support/owner-db.js';

const BASE = '/api/v1/backoffice/economic-groups';

const card = {
  holderName: 'Carla Mendonça',
  holderCpf: '529.982.247-25',
  holderBirthDate: '1980-05-20',
  cardNumber: '6062 8256 2425 4001',
  storeCode: 1,
};

describe('grupo · titularidade e Cartão Alelo', () => {
  let groupId: string;

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    const group = await createGroup(101, 'Grupo A');
    groupId = group.id;
    await createStore(group.id, brand.id, 1);
    const inactive = await createStore(group.id, brand.id, 2);
    await ownerDb.store.update({ where: { id: inactive.id }, data: { status: 'INACTIVE' } });
    const other = await createGroup(202, 'Grupo B');
    await createStore(other.id, brand.id, 3);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('deve transferir a titularidade com código novo e auditoria só com códigos', async () => {
    const response = await request(app).post(`${BASE}/101/owner-transfer`).set(ADMIN_HEADERS).send({
      name: 'Nova Pessoa',
      email: 'nova@exemplo.com.br',
      phone: '11911112222',
      justification: 'Venda da participação',
    });
    const audit = await request(app).get(`${BASE}/101/audit-events`).set(ADMIN_HEADERS);
    const owners = await ownerDb.groupOwner.findMany({ where: { economicGroupId: groupId } });

    expect(response.status).toBe(200);
    expect(response.body.owner).toMatchObject({ name: 'Nova Pessoa' });
    expect(response.body.owner.pseudonym).not.toBe('F-00101');
    expect(audit.body.data[0]).toMatchObject({
      action: 'OWNER_TRANSFERRED',
      summary: `Titularidade transferida de F-00101 para ${response.body.owner.pseudonym}`,
      justification: 'Venda da participação',
    });
    expect(audit.body.data[0].summary).not.toMatch(/Nova Pessoa|Dona/);
    expect(owners.filter((owner) => owner.deletedAt === null)).toHaveLength(1);
  });

  it('o analista não transfere', async () => {
    const response = await request(app)
      .post(`${BASE}/101/owner-transfer`)
      .set(ANALYST_HEADERS)
      .send({ name: 'X Y Z', email: 'x@y.com.br', phone: '11911112222', justification: 'Motivo' });

    expect(response.status).toBe(403);
  });

  it('deve guardar o Cartão Alelo e nunca devolver o número inteiro', async () => {
    const saved = await request(app).put(`${BASE}/101/benefit-card`).set(ADMIN_HEADERS).send(card);
    const asAnalyst = await request(app).get(`${BASE}/101`).set(ANALYST_HEADERS);

    expect(saved.status).toBe(200);
    expect(saved.body.benefitCard).toMatchObject({
      holderName: 'Carla Mendonça',
      holderCpfMasked: '529.***.***-25',
      holderBirthDate: '1980-05-20',
      cardLast4: '4001',
      store: { code: 1 },
    });
    expect(JSON.stringify(saved.body)).not.toContain('6062825624254001');
    expect(asAnalyst.body.benefitCard).toEqual({
      holderPseudonym: saved.body.benefitCard.holderPseudonym,
      store: { code: 1, name: expect.any(String), status: 'ACTIVE' },
    });
    expect(JSON.stringify(asAnalyst.body)).not.toMatch(
      /52998224725|1980-05-20|4001|Carla Mendonça/,
    );
  });

  it('deve recusar CPF inválido, loja inativa e loja de outro grupo', async () => {
    const badCpf = await request(app)
      .put(`${BASE}/101/benefit-card`)
      .set(ADMIN_HEADERS)
      .send({ ...card, holderCpf: '111.111.111-11' });
    const inactive = await request(app)
      .put(`${BASE}/101/benefit-card`)
      .set(ADMIN_HEADERS)
      .send({ ...card, storeCode: 2 });
    const other = await request(app)
      .put(`${BASE}/101/benefit-card`)
      .set(ADMIN_HEADERS)
      .send({ ...card, storeCode: 3 });

    expect(badCpf.status).toBe(400);
    expect(inactive.body.error.code).toBe('STORE_NOT_ACTIVE');
    expect(other.body.error.code).toBe('STORE_NOT_IN_GROUP');
  });

  it('o cartão é dado do grupo: outro grupo não lê', async () => {
    await request(app).put(`${BASE}/101/benefit-card`).set(ADMIN_HEADERS).send(card);
    const other = await createGroup(303, 'Grupo C');

    const seenByOther = await withActor(
      { kind: 'tenant', subject: 'F-00303', role: 'TENANT_ADMIN', tenantId: other.id },
      (tx) => tx.groupBenefitCard.count(),
    );
    const seenByOwner = await withActor(
      { kind: 'tenant', subject: 'F-00101', role: 'TENANT_ADMIN', tenantId: groupId },
      (tx) => tx.groupBenefitCard.count(),
    );

    expect(seenByOther).toBe(0);
    expect(seenByOwner).toBe(1);
  });
});
