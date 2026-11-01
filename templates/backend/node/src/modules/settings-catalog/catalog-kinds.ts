import type { CatalogKind } from '../../generated/prisma/client.js';

// As 8 listas de Configurações → Atributos da loja (specs/004). O endereço usa o slug.
export const CATALOG_LISTS = [
  { slug: 'furniture', kind: 'FURNITURE', label: 'Mobiliário' },
  { slug: 'services', kind: 'SERVICE', label: 'Serviços' },
  { slug: 'demand-systems', kind: 'DEMAND_SYSTEM', label: 'Sistema utilizado' },
  { slug: 'practice-tools', kind: 'PRACTICE_TOOL', label: 'Ferramentas de boas práticas' },
  { slug: 'pbms', kind: 'PBM', label: 'PBMs' },
  { slug: 'strategies', kind: 'STRATEGY', label: 'Estratégias comerciais' },
  { slug: 'external-tools', kind: 'EXTERNAL_TOOL', label: 'Ferramentas externas' },
  { slug: 'channels', kind: 'CHANNEL', label: 'Canais de venda' },
] as const satisfies readonly { slug: string; kind: CatalogKind; label: string }[];

export type CatalogSlug = (typeof CATALOG_LISTS)[number]['slug'];
export const CATALOG_SLUGS = CATALOG_LISTS.map((list) => list.slug) as [
  CatalogSlug,
  ...CatalogSlug[],
];

export const listOfSlug = (slug: CatalogSlug) => CATALOG_LISTS.find((list) => list.slug === slug)!;

// Tipos de mobiliário desta etapa (viram lista editável na etapa 2).
export const FURNITURE_TYPES = [
  'gondola',
  'checkout',
  'balcao',
  'frio',
  'expositor',
  'sala',
  'outro',
] as const;
export type FurnitureType = (typeof FURNITURE_TYPES)[number];

export const CHANNEL_TYPES = ['prop', 'terc'] as const;

// Gôndolas e expositores são a área de autosserviço; o administrador pode mudar item a item.
export const defaultSelfService = (type: string): boolean =>
  type === 'gondola' || type === 'expositor';
