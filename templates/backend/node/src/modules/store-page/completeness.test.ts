import { describe, expect, it } from 'vitest';
import { bandOf, computeCompleteness, documentStatus, validationStatus } from './completeness.js';

const fullBasic = {
  name: 'Aurora Santana',
  tradeName: 'DROGARIA AURORA',
  storeCategory: 'Conversão',
  affiliatedNetwork: 'SP Farma',
  openedAt: '2018-04-12',
  phone1: '1130004120',
  phone2: '1130004121',
  whatsapp: '11900004120',
  deliveryPhone: '1130004199',
  email: 'santana@auroranorte.com.br',
  ownerMobile: '11900004410',
  ownerPersonalEmail: 'carla@exemplo.com.br',
  popZip: '02011100',
  popStreet: 'Av. Cruzeiro do Sul',
  popNumber: '3100',
  popDistrict: 'Santana',
  popCity: 'São Paulo',
  popUf: 'SP',
};
const allDocs = ['OPERATING_PERMIT', 'SANITARY_LICENSE', 'AFE', 'CRF'];
const fullStructure = {
  structure: { areaM2: 240, salesAreaM2: 180, staffCount: 11, demandSystemId: 'linx' },
  hasOpeningHours: true,
  serviceCount: 6,
  pbmCount: 9,
  strategyCount: 3,
};

describe('computeCompleteness', () => {
  it('conta 30 itens: 18 campos básicos, 8 de estrutura e 4 documentos (complemento não conta)', () => {
    expect(
      computeCompleteness({ basic: fullBasic, documentTypes: allDocs, ...fullStructure }),
    ).toEqual({
      filled: 30,
      total: 30,
      missing: [],
    });
  });

  it('aponta estrutura, horário e catálogos que faltam', () => {
    const result = computeCompleteness({ basic: fullBasic, documentTypes: allDocs });
    expect(result.total).toBe(30);
    expect(result.missing).toEqual([
      'Área da loja',
      'Área de venda',
      'Número de colaboradores',
      'Horário de funcionamento',
      'Serviços oferecidos',
      'Sistema de demanda',
      'PBMs aceitos',
      'Estratégias da loja',
    ]);
  });

  it('lista o que falta, com rótulo para a pessoa', () => {
    const result = computeCompleteness({
      basic: { ...fullBasic, phone2: '', whatsapp: null },
      documentTypes: ['AFE'],
      ...fullStructure,
    });
    expect(result.filled).toBe(25);
    expect(result.missing).toEqual([
      'Telefone 2',
      'WhatsApp',
      'Alvará de funcionamento',
      'Licença sanitária',
      'Certidão de regularidade (CRF)',
    ]);
  });
});

describe('bandOf', () => {
  it('separa completo, falta algo (80–99%) e falta muito (<80%)', () => {
    expect(bandOf(30, 30)).toBe('complete');
    expect(bandOf(24, 30)).toBe('partial');
    expect(bandOf(23, 30)).toBe('low');
  });
});

describe('validationStatus', () => {
  const today = new Date('2026-10-30T12:00:00.000Z');

  it('nunca validada', () => {
    expect(validationStatus(null, today).status).toBe('never');
  });

  it('em dia, vence em breve e vencida', () => {
    expect(validationStatus(new Date('2026-09-02T12:00:00Z'), today).status).toBe('ok');
    const soon = validationStatus(new Date('2026-05-14T12:00:00Z'), today);
    expect(soon.status).toBe('due_soon');
    expect(soon.days).toBe(15);
    expect(validationStatus(new Date('2026-01-10T12:00:00Z'), today).status).toBe('overdue');
  });
});

describe('documentStatus', () => {
  const today = new Date('2026-10-30T00:00:00.000Z');

  it('válido, vence em até 30 dias e vencido', () => {
    expect(documentStatus(null, today)).toBe('valid');
    expect(documentStatus(new Date('2027-06-30'), today)).toBe('valid');
    expect(documentStatus(new Date('2026-11-15'), today)).toBe('due_soon');
    expect(documentStatus(new Date('2026-09-30'), today)).toBe('expired');
  });
});
