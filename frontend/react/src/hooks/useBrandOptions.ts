import { useApiQuery } from './useApiQuery';
import type { Paginated } from '@/lib/api';

export type BrandOption = { id: string; name: string; status: 'ACTIVE' | 'HISTORICAL' };

// Lista curta de marcas para filtros e para o cadastro de loja (catálogo fechado, ~11 hoje).
export function useBrandOptions() {
  const query = useApiQuery<Paginated<BrandOption>>('/brands?pageSize=100');
  const all = [...(query.data?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return {
    all,
    active: all.filter((brand) => brand.status === 'ACTIVE'),
    isLoading: query.isLoading,
  };
}
