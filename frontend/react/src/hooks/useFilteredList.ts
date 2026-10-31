import { useState } from 'react';
import { buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from './useApiQuery';
import { useDebouncedValue } from './useDebouncedValue';
import { fieldsQuery, useFieldFilters, type FieldValues } from './useFieldFilters';

const PAGE_SIZE = 20;

// Lista paginada com busca e "+ Filtro". resource = '/stores', '/employees'…; o CSV usa os
// mesmos filtros em `${resource}/export`.
export function useFilteredList<F extends string, T>(
  resource: string,
  initial: FieldValues<F> | (() => FieldValues<F>) = {},
) {
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  // Mudar qualquer filtro volta para a primeira página.
  const filters = useFieldFilters<F>(initial, () => setPage(1));
  const search = useDebouncedValue(searchText.trim());
  const query = { ...fieldsQuery(filters.fields), search };
  const list = useApiQuery<Paginated<T>>(
    `${resource}${buildQuery({ ...query, page, pageSize: PAGE_SIZE })}`,
  );

  return {
    filters,
    search: searchText,
    debouncedSearch: search,
    setSearch: (value: string) => {
      setSearchText(value);
      setPage(1);
    },
    page,
    setPage,
    clearFilters: () => {
      setSearchText('');
      filters.clearFields();
    },
    hasFilters: Boolean(searchText) || filters.hasFields,
    exportPath: `${resource}/export${buildQuery(query)}`,
    rows: list.data?.data ?? [],
    meta: list.data?.meta,
    isLoading: list.isLoading && !list.data,
    isRefreshing: list.isLoading && Boolean(list.data),
    error: list.error,
    reload: list.reload,
  };
}
