export type CatalogSlug =
  | 'furniture'
  | 'services'
  | 'demand-systems'
  | 'practice-tools'
  | 'pbms'
  | 'strategies'
  | 'external-tools'
  | 'channels'
  | 'departments'
  | 'occupations';

export type CatalogStatus = 'active' | 'inactive' | 'all';

export type CatalogSection = 'store' | 'people';

export type CatalogSummary = {
  kind: CatalogSlug;
  label: string;
  section: CatalogSection;
  active: number;
  inactive: number;
};

// Item de uma lista de Configurações (contracts/api.md).
export type SettingsCatalogItem = {
  id: string;
  name: string;
  groupLabel: string | null;
  description: string | null;
  negotiatedMonthlyCents: number | null;
  icon: string | null;
  selfService: boolean;
  usedByScale: boolean;
  active: boolean;
  position: number;
  // Lojas (listas da loja) ou funcionários (listas de pessoas) que usam o item.
  inUse: number;
  version: number;
  updatedAt: string;
};

export type CatalogItemInput = Partial<{
  name: string;
  groupLabel: string | null;
  description: string | null;
  icon: string;
  selfService: boolean;
  usedByScale: boolean;
  negotiatedMonthlyCents: number | null;
}>;
