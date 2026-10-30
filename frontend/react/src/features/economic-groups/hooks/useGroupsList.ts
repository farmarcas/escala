import { useState } from 'react';
import { buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { GroupStats, GroupSummary, GroupsFilter } from '../types';

const PAGE_SIZE = 20;

const INITIAL: GroupsFilter = { status: 'all', search: '', uf: '', brandId: '', page: 1 };

export function useGroupsList() {
  const [filter, setFilter] = useState<GroupsFilter>(INITIAL);
  const search = useDebouncedValue(filter.search.trim());

  const path = `/economic-groups${buildQuery({
    page: filter.page,
    pageSize: PAGE_SIZE,
    status: filter.status === 'all' ? undefined : filter.status,
    search,
    uf: filter.uf,
    brandId: filter.brandId,
  })}`;
  const list = useApiQuery<Paginated<GroupSummary>>(path);
  const stats = useApiQuery<GroupStats>('/economic-groups/stats');

  // Mudar qualquer filtro volta para a primeira página.
  const updateFilter = (patch: Partial<Omit<GroupsFilter, 'page'>>) =>
    setFilter((current) => ({ ...current, ...patch, page: 1 }));

  return {
    filter,
    updateFilter,
    setPage: (page: number) => setFilter((current) => ({ ...current, page })),
    clearFilters: () => setFilter(INITIAL),
    hasFilters:
      filter.status !== 'all' || filter.search !== '' || filter.uf !== '' || filter.brandId !== '',
    groups: list.data?.data ?? [],
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
