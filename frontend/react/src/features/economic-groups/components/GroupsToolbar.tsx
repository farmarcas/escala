import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectField } from '@/components/ui/SelectField';
import { UF_OPTIONS } from '@/lib/uf';
import type { BrandOption } from '@/hooks/useBrandOptions';
import type { GroupStats, GroupsFilter, StatusFilter } from '../types';

type GroupsToolbarProps = {
  filter: GroupsFilter;
  stats: GroupStats | undefined;
  brands: BrandOption[];
  onChange: (patch: Partial<Omit<GroupsFilter, 'page'>>) => void;
};

export function GroupsToolbar({ filter, stats, brands, onChange }: GroupsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-4">
      <SegmentedControl<StatusFilter>
        label="Filtrar por status"
        value={filter.status}
        onChange={(status) => onChange({ status })}
        segments={[
          { value: 'all', label: 'Todos', count: stats?.byStatus.all },
          { value: 'ACTIVE', label: 'Ativos', count: stats?.byStatus.active },
          { value: 'SUSPENDED', label: 'Suspensos', count: stats?.byStatus.suspended },
          { value: 'ARCHIVED', label: 'Arquivados', count: stats?.byStatus.archived },
        ]}
      />
      <SearchField
        label="Buscar por número do GE, nome ou proprietário"
        value={filter.search}
        onChange={(search) => onChange({ search })}
        className="max-w-[340px] flex-1"
      />
      <SelectField
        isLabelInline
        label="Filtrar por estado"
        placeholder="Todos"
        options={UF_OPTIONS}
        value={filter.uf}
        onChange={(event) => onChange({ uf: event.target.value })}
      />
      <SelectField
        isLabelInline
        label="Filtrar por marca"
        placeholder="Todas"
        options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
        value={filter.brandId}
        onChange={(event) => onChange({ brandId: event.target.value })}
      />
    </div>
  );
}
