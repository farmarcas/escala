import { describe, expect, it } from 'vitest';
import type { UfPresence } from '../types';
import {
  binOf,
  brandMix,
  frameFor,
  METRICS,
  ownerShare,
  ranking,
  regionOf,
  storesPerGroup,
  withoutPresence,
} from './map-metrics';

const presence = (overrides: Partial<UfPresence> = {}): UfPresence => ({
  uf: 'SP',
  stores: 10,
  groups: 4,
  groupsWithOwner: 1,
  cities: 3,
  topCities: [],
  brands: [],
  topGroups: [],
  ...overrides,
});

describe('mapa do início · medidas', () => {
  it('deve calcular lojas por grupo e a parte com proprietário', () => {
    expect(storesPerGroup(presence())).toBe(2.5);
    expect(ownerShare(presence())).toBe(25);
    expect(ownerShare(presence({ groups: 0, groupsWithOwner: 0 }))).toBe(0);
  });

  it('deve colocar o valor na faixa certa', () => {
    expect(binOf('stores', 1)).toBe(0);
    expect(binOf('stores', 24)).toBe(0);
    expect(binOf('stores', 25)).toBe(1);
    expect(binOf('stores', 586)).toBe(4);
    expect(binOf('owner', 36)).toBe(2);
  });

  it('deve formatar cada medida em pt-BR', () => {
    expect(METRICS.stores.format(1812)).toBe('1.812');
    expect(METRICS.density.format(3.6)).toBe('3,6');
    expect(METRICS.owner.format(39.6)).toBe('40%');
  });
});

describe('mapa do início · recortes', () => {
  it('deve achar a região da UF', () => {
    expect(regionOf('SP')).toBe('SE');
    expect(regionOf('DF')).toBe('CO');
    expect(regionOf('AC')).toBe('N');
  });

  it('deve ordenar só os estados do recorte pela medida', () => {
    const ufs = [
      presence({ uf: 'SP', stores: 5, groups: 1 }),
      presence({ uf: 'MG', stores: 8, groups: 4 }),
      presence({ uf: 'PR', stores: 9, groups: 3 }),
    ];

    expect(ranking(ufs, 'stores', null).map((r) => r.presence.uf)).toEqual(['PR', 'MG', 'SP']);
    expect(ranking(ufs, 'density', 'SE').map((r) => r.presence.uf)).toEqual(['SP', 'MG']);
  });

  it('deve listar os estados sem presença do recorte', () => {
    expect(withoutPresence([presence({ uf: 'PR' })], 'S')).toEqual(['RS', 'SC']);
    expect(withoutPresence([], null)).toHaveLength(27);
  });
});

describe('mapa do início · marcas', () => {
  it('deve mostrar as 3 maiores marcas e somar o resto em Outras', () => {
    const mix = brandMix(
      presence({
        stores: 10,
        brands: [
          { name: 'A', stores: 4 },
          { name: 'B', stores: 3 },
          { name: 'C', stores: 2 },
          { name: 'D', stores: 1 },
        ],
      }),
    );

    expect(mix).toEqual([
      { name: 'A', percent: 40, isOther: false },
      { name: 'B', percent: 30, isOther: false },
      { name: 'C', percent: 20, isOther: false },
      { name: 'Outras', percent: 10, isOther: true },
    ]);
  });

  it('não deve criar Outras quando há até 3 marcas', () => {
    const mix = brandMix(presence({ stores: 2, brands: [{ name: 'A', stores: 2 }] }));

    expect(mix).toEqual([{ name: 'A', percent: 100, isOther: false }]);
  });
});

describe('mapa do início · enquadramento', () => {
  it('deve caber o Brasil inteiro no quadro', () => {
    const frame = frameFor(null, 613, 639);

    expect(frame.scale).toBeCloseTo(1 / 1.02, 3);
  });

  it('deve aproximar mais uma UF do que a região dela', () => {
    const region = frameFor(['ES', 'MG', 'RJ', 'SP'], 900, 480);
    const uf = frameFor(['SP'], 900, 480);

    expect(uf.scale).toBeGreaterThan(region.scale);
    expect(region.scale).toBeGreaterThan(frameFor(null, 900, 480).scale);
  });
});
