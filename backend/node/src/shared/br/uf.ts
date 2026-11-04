export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

export type Uf = (typeof UFS)[number];

// Regiões do IBGE, usadas no Início para somar a rede por região.
export const REGIONS = {
  N: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
  NE: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  CO: ['DF', 'GO', 'MS', 'MT'],
  SE: ['ES', 'MG', 'RJ', 'SP'],
  S: ['PR', 'RS', 'SC'],
} as const satisfies Record<string, readonly Uf[]>;

export type Region = keyof typeof REGIONS;
