import { useState } from 'react';
import { buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Partner, PartnerStats, PartnersFilter } from '../types';

const PAGE_SIZE = 20;

const INITIAL: PartnersFilter = { type: 'all', search: '', status: '', page: 1 };

export function usePartnersList() {
  const [filter, setFilter] = useState<PartnersFilter>(INITIAL);
  const search = useDebouncedValue(filter.search.trim());

  const list = useApiQuery<Paginated<Partner>>(
    `/partners${buildQuery({
      type: filter.type === 'all' ? undefined : filter.type,
      status: filter.status,
      search,
      page: filter.page,
      pageSize: PAGE_SIZE,
    })}`,
  );
  const stats = useApiQuery<PartnerStats>('/partners/stats');

  return {
    filter,
    // Mudar qualquer filtro volta para a primeira página.
    updateFilter: (patch: Partial<Omit<PartnersFilter, 'page'>>) =>
      setFilter((current) => ({ ...current, ...patch, page: 1 })),
    setPage: (page: number) => setFilter((current) => ({ ...current, page })),
    clearFilters: () => setFilter(INITIAL),
    hasFilters: filter.type !== 'all' || Boolean(filter.search || filter.status),
    partners: list.data?.data ?? [],
    meta: list.data?.meta,
    isLoading: list.isLoading && !list.data,
    isRefreshing: list.isLoading && Boolean(list.data),
    error: list.error,
    stats: stats.data,
    reload: () => {
      list.reload();
      stats.reload();
    },
  };
}
