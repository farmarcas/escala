import { useState } from 'react';
import { apiFor, buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { HistoryRow, Side } from '../types';

export type HistoryFilter = 'all' | 'EDIT' | 'REQUEST' | 'DOCUMENT';

// A aba monta de novo a cada visita, então sempre mostra o histórico atualizado.
export function useStoreHistory(side: Side, code: number) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [page, setPage] = useState(1);
  const query = useApiQuery<Paginated<HistoryRow>>(
    `/stores/${code}/history${buildQuery({ page, pageSize: 20, kind: filter === 'all' ? undefined : filter })}`,
    apiFor(side),
  );
  return {
    rows: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading && !query.data,
    error: query.error,
    reload: query.reload,
    filter,
    setFilter: (value: HistoryFilter) => {
      setFilter(value);
      setPage(1);
    },
    setPage,
  };
}
