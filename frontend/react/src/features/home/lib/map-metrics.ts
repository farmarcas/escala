import { UFS, type Uf } from '@/lib/uf';
import type { RegionKey, UfPresence } from '../types';
import { BRAZIL_GEOMETRY, MAP_FRAME } from './brazil-geometry';

// Regras do mapa do Início (protótipo "Home Mapa"): regiões, medidas, faixas de cor,
// divisão por marca, ranking e enquadramento do zoom. Funções puras, sem React.

export const REGIONS: Record<RegionKey, { name: string; ufs: readonly Uf[] }> = {
  N: { name: 'Norte', ufs: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'] },
  NE: { name: 'Nordeste', ufs: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
  CO: { name: 'Centro-Oeste', ufs: ['DF', 'GO', 'MS', 'MT'] },
  SE: { name: 'Sudeste', ufs: ['ES', 'MG', 'RJ', 'SP'] },
  S: { name: 'Sul', ufs: ['PR', 'RS', 'SC'] },
};

export const REGION_ORDER: RegionKey[] = ['N', 'NE', 'CO', 'SE', 'S'];

export function regionOf(uf: Uf): RegionKey {
  return REGION_ORDER.find((key) => REGIONS[key].ufs.includes(uf)) ?? 'SE';
}

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat('pt-BR');

export function formatDecimal(value: number): string {
  return decimal.format(value);
}

export function storesPerGroup(presence: Pick<UfPresence, 'stores' | 'groups'>): number {
  return presence.stores / Math.max(1, presence.groups);
}

export function ownerShare(presence: Pick<UfPresence, 'groups' | 'groupsWithOwner'>): number {
  return presence.groups ? (presence.groupsWithOwner / presence.groups) * 100 : 0;
}

export type MetricKey = 'stores' | 'groups' | 'density' | 'owner';

type Metric = {
  label: string;
  value: (presence: UfPresence) => number;
  format: (value: number) => string;
  // Limite inferior de cada uma das 5 faixas; abaixo da primeira, fica na primeira.
  bins: [number, number, number, number, number];
  binLabels: [string, string, string, string, string];
};

export const METRIC_ORDER: MetricKey[] = ['stores', 'groups', 'density', 'owner'];

export const METRICS: Record<MetricKey, Metric> = {
  stores: {
    label: 'Lojas',
    value: (p) => p.stores,
    format: (v) => integer.format(v),
    bins: [1, 25, 60, 150, 300],
    binLabels: ['1–24', '25–59', '60–149', '150–299', '300+'],
  },
  groups: {
    label: 'Grupos',
    value: (p) => p.groups,
    format: (v) => integer.format(v),
    bins: [1, 8, 20, 45, 90],
    binLabels: ['1–7', '8–19', '20–44', '45–89', '90+'],
  },
  density: {
    label: 'Lojas por grupo',
    value: storesPerGroup,
    format: formatDecimal,
    bins: [0.01, 3, 3.5, 3.8, 5],
    binLabels: ['até 2,9', '3,0–3,4', '3,5–3,7', '3,8–4,9', '5+'],
  },
  owner: {
    label: 'Com proprietário',
    value: ownerShare,
    format: (v) => `${Math.round(v)}%`,
    bins: [0.01, 25, 33, 37, 40],
    binLabels: ['até 24%', '25–32%', '33–36%', '37–39%', '40%+'],
  },
};

// Faixa de 0 a 4 do valor na medida.
export function binOf(metric: MetricKey, value: number): number {
  let bin = 0;
  METRICS[metric].bins.forEach((limit, index) => {
    if (value >= limit) bin = index;
  });
  return bin;
}

export function percentOf(part: number, total: number): number {
  return total ? (part / total) * 100 : 0;
}

export type BrandSlice = { name: string; percent: number; isOther: boolean };

// Divisão das lojas da UF por marca: as 3 maiores e o resto somado em "Outras".
export function brandMix(presence: Pick<UfPresence, 'stores' | 'brands'>): BrandSlice[] {
  const top = presence.brands.slice(0, 3);
  const slices = top.map((brand) => ({
    name: brand.name,
    percent: Math.round(percentOf(brand.stores, presence.stores)),
    isOther: false,
  }));
  const rest = presence.stores - top.reduce((sum, brand) => sum + brand.stores, 0);
  if (rest > 0) {
    const shown = slices.reduce((sum, slice) => sum + slice.percent, 0);
    slices.push({ name: 'Outras', percent: Math.max(0, 100 - shown), isOther: true });
  }
  return slices;
}

// Estados do recorte (Brasil ou região) com presença, do maior para o menor na medida.
export function ranking(ufs: UfPresence[], metric: MetricKey, region: RegionKey | null) {
  const scope = region ? REGIONS[region].ufs : UFS;
  const value = METRICS[metric].value;
  return ufs
    .filter((presence) => scope.includes(presence.uf))
    .map((presence) => ({ presence, value: value(presence) }))
    .sort((a, b) => b.value - a.value || a.presence.uf.localeCompare(b.presence.uf));
}

export function withoutPresence(ufs: UfPresence[], region: RegionKey | null): Uf[] {
  const scope = region ? REGIONS[region].ufs : UFS;
  const present = new Set(ufs.map((presence) => presence.uf));
  return scope.filter((uf) => !present.has(uf));
}

export type Frame = { scale: number; translateX: number; translateY: number };

// Enquadra o Brasil, a região ou a UF no quadro do mapa (largura × altura em pixels).
export function frameFor(focus: readonly Uf[] | null, width: number, height: number): Frame {
  let box: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, ...MAP_FRAME };
  if (focus && focus.length) {
    const shapes = focus.map((uf) => BRAZIL_GEOMETRY[uf]);
    const left = Math.min(...shapes.map((s) => s.x));
    const top = Math.min(...shapes.map((s) => s.y));
    const right = Math.max(...shapes.map((s) => s.x + s.width));
    const bottom = Math.max(...shapes.map((s) => s.y + s.height));
    box = { x: left, y: top, width: right - left, height: bottom - top };
  }
  const isUf = focus?.length === 1;
  const padding = isUf ? 2.1 : focus ? 1.08 : 1.02;
  const minimum = isUf ? 90 : 120;
  const boxWidth = Math.max(box.width, minimum) * padding;
  const boxHeight = Math.max(box.height, minimum) * padding;
  const scale = Math.min(width / boxWidth, height / boxHeight);
  return {
    scale,
    translateX: width / 2 - (box.x + box.width / 2) * scale,
    translateY: height / 2 - (box.y + box.height / 2) * scale,
  };
}

// Deslocamento da etiqueta para não cobrir estados vizinhos pequenos (protótipo).
export const LABEL_OFFSET: Partial<Record<Uf, [number, number]>> = {
  DF: [26, -10],
  GO: [-14, 18],
  ES: [22, 6],
  RJ: [10, 16],
  SC: [10, 2],
  MG: [0, 2],
  RS: [6, 0],
  PR: [0, 4],
  SP: [6, 2],
  CE: [4, 0],
  RO: [-4, 0],
};
