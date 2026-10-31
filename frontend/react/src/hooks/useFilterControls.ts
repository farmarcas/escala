import { useState } from 'react';
import type { FilterTag } from '@/components/ui/FilterChips';
import type { FilterGroup, FilterOption, FilterPanel } from '@/components/ui/FilterMenu';
import { buildQuery } from '@/lib/api';
import { useApiQuery } from './useApiQuery';
import { fieldsQuery, type FieldFilters } from './useFieldFilters';

// O que cada lista diz sobre o seu "+ Filtro": de onde vêm as contagens, os campos e os nomes.
export type FilterConfig<F extends string> = {
  // '/stores', '/employees'…: as contagens ficam em `${resource}/facets`.
  resource: string;
  groups: FilterGroup<F>[];
  fieldLabel: Record<F, string>;
  valueLabel: (field: F, value: string) => string;
};

type FacetCount = { value: string; count: number };

// Liga o "+ Filtro" e as etiquetas ao estado dos campos: abre e fecha o menu, busca quantos
// registros há em cada valor (com os outros filtros e a busca aplicados) e monta as etiquetas.
export function useFilterControls<F extends string>(
  config: FilterConfig<F>,
  filters: FieldFilters<F>,
  extra: Record<string, string | undefined> = {},
) {
  const [panel, setPanel] = useState<FilterPanel<F>>(null);
  const field = panel && panel !== 'menu' ? panel : null;

  // O próprio campo sai da conta: a contagem mostra o que cada valor traria.
  const others = { ...filters.fields };
  if (field) delete others[field];
  const facets = useApiQuery<{ data: FacetCount[] }>(
    field
      ? `${config.resource}/facets${buildQuery({ ...fieldsQuery(others), ...extra, field })}`
      : null,
  );

  const options: FilterOption[] = field
    ? (facets.data?.data ?? []).map((facet) => ({
        value: facet.value,
        label: config.valueLabel(field, facet.value),
        count: facet.count,
      }))
    : [];

  const order = config.groups.flatMap((group) => group.fields);
  const tags: FilterTag<F>[] = order
    .filter((key) => filters.fields[key]?.length)
    .map((key) => ({
      field: key,
      label: config.fieldLabel[key],
      values: (filters.fields[key] ?? []).map((value) => config.valueLabel(key, value)),
    }));

  return {
    menu: {
      groups: config.groups,
      fieldLabel: config.fieldLabel,
      panel,
      onPanelChange: setPanel,
      values: filters.fields,
      options,
      isLoadingOptions: facets.isLoading && !facets.data,
      onApply: filters.setField,
    },
    tags: {
      tags,
      onEdit: (key: F) => setPanel(key),
      onRemove: (key: F) => filters.setField(key, []),
      onClear: filters.clearFields,
    },
  };
}
