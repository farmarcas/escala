import type { CatalogKind } from '../../generated/prisma/client.js';

// Listas de Configurações. O endereço usa o slug. Seção "store": atributos da loja (spec 004);
// seção "people": pessoas da Farmarcas (spec 005).
export const CATALOG_LISTS = [
  { slug: 'furniture', kind: 'FURNITURE', label: 'Mobiliário', section: 'store' },
  { slug: 'services', kind: 'SERVICE', label: 'Serviços', section: 'store' },
  { slug: 'demand-systems', kind: 'DEMAND_SYSTEM', label: 'Sistema utilizado', section: 'store' },
  {
    slug: 'practice-tools',
    kind: 'PRACTICE_TOOL',
    label: 'Ferramentas de boas práticas',
    section: 'store',
  },
  { slug: 'pbms', kind: 'PBM', label: 'PBMs', section: 'store' },
  { slug: 'strategies', kind: 'STRATEGY', label: 'Estratégias comerciais', section: 'store' },
  {
    slug: 'external-tools',
    kind: 'EXTERNAL_TOOL',
    label: 'Ferramentas externas',
    section: 'store',
  },
  { slug: 'channels', kind: 'CHANNEL', label: 'Canais de venda', section: 'store' },
  { slug: 'departments', kind: 'DEPARTMENT', label: 'Departamentos', section: 'people' },
  { slug: 'occupations', kind: 'OCCUPATION', label: 'Ocupações', section: 'people' },
] as const satisfies readonly {
  slug: string;
  kind: CatalogKind;
  label: string;
  section: 'store' | 'people';
}[];

// Tipos que a página da loja usa (os de pessoas ficam fora do catálogo da loja).
export const STORE_KINDS = CATALOG_LISTS.filter((list) => list.section === 'store').map(
  (list) => list.kind,
);

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
