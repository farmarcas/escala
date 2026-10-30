import { apiFor } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { CatalogItem, CatalogKind, Side } from '../types';

// Catálogos da Farmarcas (serviços, sistemas, PBMs, estratégias, mobiliário...), iguais para os dois lados.
export function useCatalog(side: Side) {
  const query = useApiQuery<{ data: CatalogItem[] }>('/catalog', apiFor(side));
  const items = query.data?.data ?? [];
  return {
    items,
    byKind: (kind: CatalogKind) => items.filter((item) => item.kind === kind),
    nameOf: (id: string | null) => items.find((item) => item.id === id)?.name ?? null,
    isLoading: query.isLoading && !query.data,
  };
}

export type Catalog = ReturnType<typeof useCatalog>;
