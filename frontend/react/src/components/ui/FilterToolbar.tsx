import type { ReactNode } from 'react';
import {
  FilterShortcuts,
  FilterTags,
  type FilterShortcut,
  type FilterTagsProps,
} from './FilterChips';
import { FilterMenu, type FilterMenuProps } from './FilterMenu';
import { SearchField } from './SearchField';

type FilterToolbarProps<F extends string> = {
  searchLabel: string;
  search: string;
  onSearch: (value: string) => void;
  menu: FilterMenuProps<F>;
  tags: Omit<FilterTagsProps<F>, 'summary'>;
  shortcuts?: FilterShortcut[];
  // Ex.: "Exibindo 58 de 1.945 lojas", ao lado das etiquetas.
  summary?: ReactNode;
  // Antes da busca (ex.: "Ações") e no fim da linha (ex.: Exportar CSV).
  leading?: ReactNode;
  trailing?: ReactNode;
};

// Barra de filtros das listas (protótipo Lojas Lista): busca, "+ Filtro", atalhos e etiquetas.
export function FilterToolbar<F extends string>({
  searchLabel,
  search,
  onSearch,
  menu,
  tags,
  shortcuts,
  summary,
  leading,
  trailing,
}: FilterToolbarProps<F>) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-5 py-3.5">
      {leading}
      <SearchField
        label={searchLabel}
        value={search}
        onChange={onSearch}
        className="max-w-[420px] flex-[1_1_260px]"
      />
      <FilterMenu {...menu} />
      {trailing && (
        <>
          <div className="flex-1" />
          {trailing}
        </>
      )}
      {shortcuts && shortcuts.length > 0 && <FilterShortcuts shortcuts={shortcuts} />}
      <FilterTags {...tags} summary={summary} />
    </div>
  );
}
