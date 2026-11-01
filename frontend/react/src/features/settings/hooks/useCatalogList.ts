import { useState } from 'react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { api, buildQuery } from '@/lib/api';
import type {
  CatalogItemInput,
  CatalogSlug,
  CatalogStatus,
  CatalogSummary,
  SettingsCatalogItem,
} from '../types';

const BASE = '/settings/catalog';

export function useCatalogSummary() {
  const query = useApiQuery<{ data: CatalogSummary[] }>(BASE);
  return { ...query, lists: query.data?.data ?? [] };
}

// Lista de uma das 8 listas, com busca, filtro de situação e as gravações.
export function useCatalogList(slug: CatalogSlug) {
  const [status, setStatus] = useState<CatalogStatus>('active');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const query = useApiQuery<{ data: SettingsCatalogItem[]; meta: { suggestions: string[] } }>(
    `${BASE}/${slug}${buildQuery({ status, q: debouncedSearch })}`,
  );
  const path = (id: string) => `${BASE}/${slug}/${id}`;

  const after = async <T>(action: Promise<T>) => {
    const result = await action;
    query.reload();
    return result;
  };

  return {
    ...query,
    items: query.data?.data ?? [],
    suggestions: query.data?.meta.suggestions ?? [],
    status,
    setStatus,
    search,
    setSearch,
    isSearching: debouncedSearch !== '',
    create: (input: CatalogItemInput) =>
      after(api.post<SettingsCatalogItem>(`${BASE}/${slug}`, input)),
    update: (item: SettingsCatalogItem, input: CatalogItemInput) =>
      after(api.patch<SettingsCatalogItem>(path(item.id), { version: item.version, ...input })),
    move: (item: SettingsCatalogItem, direction: 'up' | 'down') =>
      after(api.post(`${path(item.id)}/move`, { version: item.version, direction })),
    setActive: (item: SettingsCatalogItem, active: boolean) =>
      after(api.post(`${path(item.id)}/status`, { version: item.version, active })),
    remove: (item: SettingsCatalogItem) =>
      after(api.delete(`${path(item.id)}${buildQuery({ version: item.version })}`)),
  };
}

export type CatalogList = ReturnType<typeof useCatalogList>;
