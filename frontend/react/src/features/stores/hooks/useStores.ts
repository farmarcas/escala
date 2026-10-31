import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UFS } from '@/lib/uf';
import { buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Store, StoreStats } from '../types';

const PAGE_SIZE = 20;

export type StoresFilter = {
  search: string;
  brandId: string;
  angelId: string;
  uf: string;
  type: string;
  status: string;
  completeness: string;
  validation: string;
  hasOpenRequest: string;
  docAlert: string;
  outdated: string;
  stage: string;
  blocked: string;
};

const INITIAL: StoresFilter = {
  search: '',
  brandId: '',
  angelId: '',
  uf: '',
  type: '',
  status: '',
  completeness: '',
  validation: '',
  hasOpenRequest: '',
  docAlert: '',
  outdated: '',
  stage: '',
  blocked: '',
};

// Links da Visão geral e do Início chegam com filtro na URL
// (?validacao=attention, ?status=PENDING, ?solicitacao=1, ?uf=SP).
function initialFilter(params: URLSearchParams): StoresFilter {
  return {
    ...INITIAL,
    uf: UFS.find((uf) => uf === params.get('uf')) ?? '',
    validation: params.get('validacao') ?? '',
    status: params.get('status') ?? '',
    hasOpenRequest: params.get('solicitacao') ? 'true' : '',
    docAlert: params.get('documento') ? 'true' : '',
  };
}

export function useStores() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<StoresFilter>(() => initialFilter(params));
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filter.search.trim());

  const list = useApiQuery<Paginated<Store>>(
    `/stores${buildQuery({ ...filter, search, page, pageSize: PAGE_SIZE })}`,
  );
  const stats = useApiQuery<StoreStats>('/stores/stats');

  return {
    exportPath: `/stores/export${buildQuery({ ...filter, search })}`,
    filter,
    updateFilter: (patch: Partial<StoresFilter>) => {
      setFilter((current) => ({ ...current, ...patch }));
      setPage(1);
    },
    // Indicadores clicáveis: o clique liga o filtro; clicar de novo desliga.
    toggleFilter: (key: keyof StoresFilter, value: string) => {
      setFilter((current) => ({ ...current, [key]: current[key] === value ? '' : value }));
      setPage(1);
    },
    clearFilters: () => {
      setFilter(INITIAL);
      setPage(1);
    },
    hasFilters: Object.values(filter).some((value) => value !== ''),
    setPage,
    stores: list.data?.data ?? [],
    meta: list.data?.meta,
    isLoading: list.isLoading && !list.data,
    error: list.error,
    stats: stats.data,
    reload: () => {
      list.reload();
      stats.reload();
    },
  };
}
