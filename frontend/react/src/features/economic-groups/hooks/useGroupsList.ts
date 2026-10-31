import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildQuery, type Paginated } from '@/lib/api';
import { UFS } from '@/lib/uf';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { NO_ANGEL_FILTER, type GroupStats, type GroupSummary, type GroupsFilter } from '../types';

const PAGE_SIZE = 20;

const INITIAL: GroupsFilter = {
  status: 'all',
  search: '',
  uf: '',
  brandId: '',
  angel: '',
  page: 1,
};

// Atalhos com filtro na URL: /grupos?uf=SP (Início) e /grupos?semAnjo=1 (Funcionários).
function initialFilter(params: URLSearchParams): GroupsFilter {
  return {
    ...INITIAL,
    uf: UFS.find((uf) => uf === params.get('uf')) ?? '',
    angel: params.get('semAnjo') ? NO_ANGEL_FILTER : '',
  };
}

export function useGroupsList() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<GroupsFilter>(() => initialFilter(params));
  const search = useDebouncedValue(filter.search.trim());

  const filters = {
    status: filter.status === 'all' ? undefined : filter.status,
    search,
    uf: filter.uf,
    brandId: filter.brandId,
    angelId: filter.angel && filter.angel !== NO_ANGEL_FILTER ? filter.angel : undefined,
    withoutAngel: filter.angel === NO_ANGEL_FILTER ? 'true' : undefined,
  };
  const path = `/economic-groups${buildQuery({ ...filters, page: filter.page, pageSize: PAGE_SIZE })}`;
  const list = useApiQuery<Paginated<GroupSummary>>(path);
  const stats = useApiQuery<GroupStats>('/economic-groups/stats');

  // Mudar qualquer filtro volta para a primeira página.
  const updateFilter = (patch: Partial<Omit<GroupsFilter, 'page'>>) =>
    setFilter((current) => ({ ...current, ...patch, page: 1 }));

  return {
    // Exportar CSV: os mesmos filtros da lista, sem paginação.
    exportPath: `/economic-groups/export${buildQuery(filters)}`,
    filter,
    updateFilter,
    setPage: (page: number) => setFilter((current) => ({ ...current, page })),
    clearFilters: () => setFilter(INITIAL),
    hasFilters:
      filter.status !== 'all' ||
      filter.search !== '' ||
      filter.uf !== '' ||
      filter.brandId !== '' ||
      filter.angel !== '',
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
