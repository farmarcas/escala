import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildQuery, type Paginated } from '@/lib/api';
import { UFS } from '@/lib/uf';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { GroupStats, GroupSummary, GroupsFilter } from '../types';

const PAGE_SIZE = 20;

const INITIAL: GroupsFilter = { status: 'all', search: '', uf: '', brandId: '', page: 1 };

// Atalho do Início: /grupos?uf=SP já abre filtrado pelo estado.
function initialFilter(params: URLSearchParams): GroupsFilter {
  return { ...INITIAL, uf: UFS.find((uf) => uf === params.get('uf')) ?? '' };
}

export function useGroupsList() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<GroupsFilter>(() => initialFilter(params));
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
