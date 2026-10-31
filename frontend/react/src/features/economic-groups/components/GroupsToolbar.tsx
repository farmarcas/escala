import { useMemo } from 'react';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
import type { BrandOption } from '@/hooks/useBrandOptions';
import type { EmployeeOption } from '@/hooks/useEmployeeOptions';
import type { FieldFilters } from '@/hooks/useFieldFilters';
import { useFilterControls } from '@/hooks/useFilterControls';
import { formatNumber } from '@/lib/format';
import { GROUP_SHORTCUTS, groupFilterConfig, type GroupField } from '../filterFields';

type GroupsToolbarProps = {
  filters: FieldFilters<GroupField>;
  search: string;
  debouncedSearch: string;
  onSearch: (value: string) => void;
  brands: BrandOption[];
  angels: EmployeeOption[];
  shown: number;
  total: number | undefined;
};

// Busca, "+ Filtro", atalhos e etiquetas da lista de grupos (o mesmo filtro da lista de lojas).
export function GroupsToolbar({
  filters,
  search,
  debouncedSearch,
  onSearch,
  brands,
  angels,
  shown,
  total,
}: GroupsToolbarProps) {
  const config = useMemo(
    () =>
      groupFilterConfig({
        brands: new Map(brands.map((brand) => [brand.id, brand.name])),
        angels: new Map(angels.map((angel) => [angel.id, angel.name])),
      }),
    [brands, angels],
  );
  const controls = useFilterControls(config, filters, { search: debouncedSearch });

  return (
    <FilterToolbar
      searchLabel="Buscar por número do GE, nome ou proprietário"
      search={search}
      onSearch={onSearch}
      menu={controls.menu}
      tags={controls.tags}
      shortcuts={GROUP_SHORTCUTS.map((shortcut) => ({
        label: shortcut.label,
        isOn: filters.isPreset(shortcut.preset),
        onToggle: () => filters.togglePreset(shortcut.preset),
      }))}
      summary={
        total !== undefined
          ? `Exibindo ${formatNumber(shown)} de ${formatNumber(total)} grupos`
          : undefined
      }
    />
  );
}
