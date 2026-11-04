import { useState } from 'react';
import { buildQuery } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { Overview } from '../types';

export type OverviewFilter = { brandId: string; uf: string };

export function useOverview() {
  const [filter, setFilter] = useState<OverviewFilter>({ brandId: '', uf: '' });
  const query = useApiQuery<Overview>(`/overview${buildQuery(filter)}`);
  return {
    filter,
    updateFilter: (patch: Partial<OverviewFilter>) =>
      setFilter((current) => ({ ...current, ...patch })),
    overview: query.data,
    isLoading: query.isLoading && !query.data,
    isRefreshing: query.isLoading && Boolean(query.data),
    error: query.error,
    reload: query.reload,
  };
}
