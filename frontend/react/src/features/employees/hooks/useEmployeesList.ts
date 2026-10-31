import { useState } from 'react';
import { buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Employee, EmployeeStats, EmployeesFilter } from '../types';

const PAGE_SIZE = 20;

const INITIAL: EmployeesFilter = { search: '', area: '', accessRole: '', status: '', page: 1 };

export function useEmployeesList() {
  const [filter, setFilter] = useState<EmployeesFilter>(INITIAL);
  const search = useDebouncedValue(filter.search.trim());

  const list = useApiQuery<Paginated<Employee>>(
    `/employees${buildQuery({ ...filter, search, pageSize: PAGE_SIZE })}`,
  );
  const stats = useApiQuery<EmployeeStats>('/employees/stats');

  return {
    exportPath: `/employees/export${buildQuery({ ...filter, page: undefined, search })}`,
    filter,
    // Mudar qualquer filtro volta para a primeira página.
    updateFilter: (patch: Partial<Omit<EmployeesFilter, 'page'>>) =>
      setFilter((current) => ({ ...current, ...patch, page: 1 })),
    setPage: (page: number) => setFilter((current) => ({ ...current, page })),
    clearFilters: () => setFilter(INITIAL),
    hasFilters: Boolean(filter.search || filter.area || filter.accessRole || filter.status),
    employees: list.data?.data ?? [],
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
