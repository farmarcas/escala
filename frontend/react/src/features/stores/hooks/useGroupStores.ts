import { useCallback, useState } from 'react';
import { api, buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Store, StoreInput, StoreType } from '../types';

const PAGE_SIZE = 20;

export type TypeFilter = 'all' | StoreType;

export function useGroupStores(groupNumber: number, onChanged: () => void) {
  const [type, setType] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search.trim());

  const query = useApiQuery<Paginated<Store>>(
    `/economic-groups/${groupNumber}/stores${buildQuery({
      page,
      pageSize: PAGE_SIZE,
      type: type === 'all' ? undefined : type,
      search: debounced,
    })}`,
  );
  const reload = query.reload;

  const create = useCallback(
    async (input: StoreInput) => {
      await api.post<Store>(`/economic-groups/${groupNumber}/stores`, input);
      setType('all');
      setSearch('');
      setPage(1);
      reload();
      onChanged();
    },
    [groupNumber, onChanged, reload],
  );

  const setStatus = useCallback(
    async (id: string, status: 'ACTIVE' | 'INACTIVE', justification: string) => {
      await api.patch<Store>(`/stores/${id}/status`, { status, justification });
      reload();
      onChanged();
    },
    [onChanged, reload],
  );

  return {
    type,
    setType: (value: TypeFilter) => {
      setType(value);
      setPage(1);
    },
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    setPage,
    stores: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading && !query.data,
    error: query.error,
    reload,
    create,
    setStatus,
  };
}
