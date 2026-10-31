import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UFS } from '@/lib/uf';
import { buildQuery, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Store, StoreStats } from '../types';

const PAGE_SIZE = 20;

// Campos do "+ Filtro" (protótipo Lojas Lista): cada um aceita vários valores, que somam (ou);
// campos diferentes se combinam (e).
export type FilterField =
  | 'brandId'
  | 'uf'
  | 'angelId'
  | 'stage'
  | 'status'
  | 'blocked'
  | 'completeness'
  | 'validation'
  | 'alert';

export type FieldValues = Partial<Record<FilterField, string[]>>;

export type StoresFilter = { search: string; fields: FieldValues };

const INITIAL: StoresFilter = { search: '', fields: {} };

// Links da Visão geral e do Início chegam com filtro na URL
// (?uf=SP, ?status=OPERATING, ?validacao=attention, ?solicitacao=1, ?documento=1).
function initialFilter(params: URLSearchParams): StoresFilter {
  const fields: FieldValues = {};
  const uf = UFS.find((value) => value === params.get('uf'));
  if (uf) fields.uf = [uf];
  if (params.get('status')) fields.status = [params.get('status')!];
  if (params.get('validacao')) fields.validation = [params.get('validacao')!];
  const alerts = [
    ...(params.get('documento') ? ['doc'] : []),
    ...(params.get('solicitacao') ? ['request'] : []),
  ];
  if (alerts.length) fields.alert = alerts;
  return { search: '', fields };
}

// Query da API: cada campo vira "valor1,valor2".
export function fieldsQuery(fields: FieldValues): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, values]) => [
      key,
      values?.length ? values.join(',') : undefined,
    ]),
  );
}

const sameValues = (a: string[] | undefined, b: string[]) =>
  (a?.length ?? 0) === b.length && b.every((value) => a?.includes(value));

export function useStores() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<StoresFilter>(() => initialFilter(params));
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filter.search.trim());
  const query = { ...fieldsQuery(filter.fields), search };

  const list = useApiQuery<Paginated<Store>>(
    `/stores${buildQuery({ ...query, page, pageSize: PAGE_SIZE })}`,
  );
  const stats = useApiQuery<StoreStats>('/stores/stats');

  const update = (next: (current: StoresFilter) => StoresFilter) => {
    setFilter(next);
    setPage(1);
  };

  const setField = (field: FilterField, values: string[]) =>
    update((current) => {
      const fields = { ...current.fields };
      if (values.length) fields[field] = values;
      else delete fields[field];
      return { ...current, fields };
    });

  return {
    filter,
    query,
    exportPath: `/stores/export${buildQuery(query)}`,
    setSearch: (value: string) => update((current) => ({ ...current, search: value })),
    setField,
    // Indicadores e rosca: o clique liga só aquele valor; clicar de novo desliga.
    toggleSingle: (field: FilterField, value: string) =>
      setField(field, sameValues(filter.fields[field], [value]) ? [] : [value]),
    isSingle: (field: FilterField, value: string) => sameValues(filter.fields[field], [value]),
    // Atalhos: ligam (ou desligam) um conjunto de campos de uma vez.
    isPreset: (preset: FieldValues) =>
      Object.entries(preset).every(([key, values]) =>
        sameValues(filter.fields[key as FilterField], values ?? []),
      ),
    togglePreset: (preset: FieldValues) =>
      update((current) => {
        const isOn = Object.entries(preset).every(([key, values]) =>
          sameValues(current.fields[key as FilterField], values ?? []),
        );
        const fields = { ...current.fields };
        for (const [key, values] of Object.entries(preset)) {
          if (isOn) delete fields[key as FilterField];
          else fields[key as FilterField] = values;
        }
        return { ...current, fields };
      }),
    clearFields: () => update((current) => ({ ...current, fields: {} })),
    clearFilters: () => update(() => INITIAL),
    hasFilters: Boolean(filter.search) || Object.keys(filter.fields).length > 0,
    page,
    setPage,
    stores: list.data?.data ?? [],
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
