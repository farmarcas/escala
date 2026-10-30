import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import {
  ADMIN_HEADERS,
  createBrand,
  createCatalogItem,
  createGroup,
  createStore,
  ownerDb,
  ownerHeaders,
  resetBackoffice,
} from '../../test-support/owner-db.js';
import { WEEKDAYS } from './structure/hours.js';

const BO = '/api/v1/backoffice';
const TN = '/api/v1/tenant';

const week = (closeAt = '20:00') =>
  WEEKDAYS.map((day) => ({
    day,
    isOpen: day !== 'SUN',
    opensAt: day !== 'SUN' ? '08:00' : null,
    closesAt: day !== 'SUN' ? closeAt : null,
    is24h: false,
    isOnCall: day === 'SUN',
  }));

describe('página da loja · estrutura, estratégias e mobiliário', () => {
  let owner: Record<string, string>;
  let catalog: Record<string, string>;

  beforeEach(async () => {
    await resetBackoffice();
    const brand = await createBrand('rede teste');
    const group = await createGroup(417, 'Grupo Aurora');
    owner = ownerHeaders(group.id);
    await createStore(group.id, brand.id, 2);
    catalog = {
      derma: (await createCatalogItem('SERVICE', 'Dermocosméticos')).id,
      linx: (await createCatalogItem('DEMAND_SYSTEM', 'Linx Big')).id,
      pbm: (await createCatalogItem('PBM', 'VIDALINK')).id,
      bairro: (await createCatalogItem('STRATEGY', 'Loja de bairro')).id,
      gondola: (await createCatalogItem('FURNITURE', 'Gôndolas')).id,
    };
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('o grupo salva estrutura, horário e catálogos, e o preenchimento conta os novos itens', async () => {
    const before = await request(app).get(`${TN}/stores/2`).set(owner);
    const saved = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({
        expectedVersion: 1,
        structure: {
          ownBuilding: true,
          areaM2: 240,
          salesAreaM2: 180,
          staffCount: 11,
          demandSystemId: catalog.linx,
        },
        hours: week(),
        selections: { services: [catalog.derma], pbms: [catalog.pbm] },
      });
    const history = await request(app).get(`${BO}/stores/2/history`).set(ADMIN_HEADERS);

    expect(before.body.governance.total).toBe(30);
    expect(saved.status).toBe(200);
    expect(saved.body.structure).toMatchObject({ areaM2: 240, demandSystemId: catalog.linx });
    expect(saved.body.selections.services).toEqual([catalog.derma]);
    expect(saved.body.hours.find((h: { day: string }) => h.day === 'SUN')).toMatchObject({
      isOpen: false,
      isOnCall: true,
    });
    expect(saved.body.governance.filled - before.body.governance.filled).toBe(7);
    const labels = history.body.data.map((row: { fieldLabel: string }) => row.fieldLabel);
    expect(labels).toEqual(
      expect.arrayContaining([
        'Horário de funcionamento',
        'Serviços oferecidos',
        'Sistema de demanda',
      ]),
    );
  });

  it('recusa fechar antes de abrir e item de catálogo de outro tipo', async () => {
    const badHours = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 1, hours: week('07:00') });
    const wrongKind = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 1, selections: { services: [catalog.pbm] } });

    expect(badHours.status).toBe(400);
    expect(wrongKind.body.error.code).toBe('CATALOG_ITEM_INVALID');
  });

  it('estratégias: o grupo define e mantém o "desde"; a Farmarcas só vê', async () => {
    const set = await request(app)
      .put(`${TN}/stores/2/strategies`)
      .set(owner)
      .send({ itemIds: [catalog.bairro] });
    const again = await request(app)
      .put(`${TN}/stores/2/strategies`)
      .set(owner)
      .send({ itemIds: [catalog.bairro] });
    const platform = await request(app)
      .put(`${BO}/stores/2/strategies`)
      .set(ADMIN_HEADERS)
      .send({ itemIds: [] });

    expect(set.body.strategies).toEqual([{ itemId: catalog.bairro, since: expect.any(String) }]);
    expect(again.body.strategies[0].since).toBe(set.body.strategies[0].since);
    expect(platform.status).toBe(403);
  });

  it('mobiliário: os dois lados editam e Trade não passa do total', async () => {
    const tooMuch = await request(app)
      .put(`${TN}/stores/2/furniture/${catalog.gondola}`)
      .set(owner)
      .send({ quantity: 2, tradeQuantity: 3 });
    const ok = await request(app)
      .put(`${BO}/stores/2/furniture/${catalog.gondola}`)
      .set(ADMIN_HEADERS)
      .send({ quantity: 14, tradeQuantity: 4 });

    expect(tooMuch.body.error.code).toBe('TRADE_EXCEEDS_TOTAL');
    expect(ok.body.furniture).toEqual([
      { itemId: catalog.gondola, quantity: 14, tradeQuantity: 4 },
    ]);
  });

  it('seções livres: só a Farmarcas cria; o grupo vê', async () => {
    const byTenant = await request(app)
      .patch(`${TN}/stores/2`)
      .set(owner)
      .send({ expectedVersion: 1, freeSections: [{ title: 'Nota', fields: [] }] });
    const byPlatform = await request(app)
      .patch(`${BO}/stores/2`)
      .set(ADMIN_HEADERS)
      .send({
        expectedVersion: 1,
        reason: 'Registro da visita',
        freeSections: [
          {
            title: 'Observações da visita',
            fields: [{ label: 'Ponto de atenção', value: 'Fachada' }],
          },
        ],
      });
    const seen = await request(app).get(`${TN}/stores/2`).set(owner);

    expect(byTenant.status).toBe(403);
    expect(byPlatform.status).toBe(200);
    expect(seen.body.freeSections).toMatchObject([
      { title: 'Observações da visita', fields: [{ label: 'Ponto de atenção', value: 'Fachada' }] },
    ]);
  });

  it('o catálogo está disponível para os dois lados', async () => {
    const platform = await request(app).get(`${BO}/catalog?kind=FURNITURE`).set(ADMIN_HEADERS);
    const tenant = await request(app).get(`${TN}/catalog`).set(owner);

    expect(platform.body.data.map((item: { name: string }) => item.name)).toEqual(['Gôndolas']);
    expect(tenant.body.data).toHaveLength(5);
  });
});
