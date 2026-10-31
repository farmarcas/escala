import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

// 'menu' = escolher o campo; um campo = escolher os valores dele.
export type FilterPanel<F extends string = string> = 'menu' | F | null;

export type FilterGroup<F extends string> = { title?: string; fields: F[] };

// Valor do campo aberto: nome na tela e quantos registros há nele.
export type FilterOption = { value: string; label: string; count?: number };

export type FilterMenuProps<F extends string> = {
  groups: FilterGroup<F>[];
  fieldLabel: Record<F, string>;
  panel: FilterPanel<F>;
  onPanelChange: (panel: FilterPanel<F>) => void;
  values: Partial<Record<F, string[]>>;
  // Valores do campo aberto (panel), com a contagem já considerando os outros filtros.
  options: FilterOption[];
  isLoadingOptions?: boolean;
  onApply: (field: F, values: string[]) => void;
};

// A busca de campos só aparece quando a lista é grande.
const FIELD_SEARCH_FROM = 6;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

// "+ Filtro" das listas (protótipo Lojas Lista): campos por grupo, depois os valores do campo com
// a quantidade em cada um. Vários valores por campo; Cancelar ou Aplicar.
export function FilterMenu<F extends string>({
  groups,
  fieldLabel,
  panel,
  onPanelChange,
  values,
  options,
  isLoadingOptions = false,
  onApply,
}: FilterMenuProps<F>) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Clique fora ou Escape fecham sem aplicar.
  useEffect(() => {
    if (!panel) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onPanelChange(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onPanelChange(null);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [panel, onPanelChange]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={panel !== null}
        aria-haspopup="dialog"
        onClick={() => onPanelChange(panel ? null : 'menu')}
        className={cn(
          'flex items-center gap-1.5 whitespace-nowrap rounded-md border bg-surface px-3.5 py-2 text-[13px] font-semibold text-secondary-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          panel ? 'border-primary' : 'border-border hover:border-control',
        )}
      >
        <Plus aria-hidden="true" className="size-4 text-primary" />
        Filtro
      </button>
      {panel === 'menu' && (
        <FieldList
          groups={groups}
          fieldLabel={fieldLabel}
          values={values}
          onPick={(field) => onPanelChange(field)}
        />
      )}
      {panel && panel !== 'menu' && (
        <ValuePicker
          key={panel}
          label={fieldLabel[panel]}
          initial={values[panel] ?? []}
          options={options}
          isLoading={isLoadingOptions}
          onBack={() => onPanelChange('menu')}
          onCancel={() => onPanelChange(null)}
          onApply={(selected) => {
            onApply(panel, selected);
            onPanelChange(null);
          }}
        />
      )}
    </div>
  );
}

const panelClass =
  'absolute left-0 top-[calc(100%+4px)] z-30 w-[260px] rounded-lg border border-border bg-surface shadow-[0_8px_16px_-4px_rgb(9_30_66/0.25)]';

type FieldListProps<F extends string> = {
  groups: FilterGroup<F>[];
  fieldLabel: Record<F, string>;
  values: Partial<Record<F, string[]>>;
  onPick: (field: F) => void;
};

function FieldList<F extends string>({ groups, fieldLabel, values, onPick }: FieldListProps<F>) {
  const [query, setQuery] = useState('');
  const q = normalize(query);
  const hasSearch = groups.flatMap((group) => group.fields).length >= FIELD_SEARCH_FROM;
  // Campos já filtrados saem da lista: para mudar, clique na etiqueta.
  const visible = groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter(
        (field) => !values[field]?.length && (!q || normalize(fieldLabel[field]).includes(q)),
      ),
    }))
    .filter((group) => group.fields.length > 0);

  return (
    <div role="dialog" aria-label="Escolher campo do filtro" className={cn(panelClass, 'py-2')}>
      {hasSearch && (
        <div className="px-2.5 pb-2">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar campo"
            aria-label="Buscar campo"
            className="w-full rounded-md border border-border px-2.5 py-1.5 text-[13px] outline-none focus:border-primary"
          />
        </div>
      )}
      {visible.map((group) => (
        <div key={group.title ?? group.fields.join()}>
          {group.title && (
            <p className="px-3.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
              {group.title}
            </p>
          )}
          {group.fields.map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => onPick(field)}
              className="flex w-full items-center px-3.5 py-2 text-left text-[13px] hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none"
            >
              <span className="flex-1">{fieldLabel[field]}</span>
              <ChevronRight aria-hidden="true" className="size-4 text-control" />
            </button>
          ))}
        </div>
      ))}
      {visible.length === 0 && (
        <p className="px-3.5 py-2.5 text-[13px] text-muted-foreground">
          {q ? 'Nenhum campo encontrado' : 'Todos os campos já estão filtrados'}
        </p>
      )}
    </div>
  );
}

type ValuePickerProps = {
  label: string;
  initial: string[];
  options: FilterOption[];
  isLoading: boolean;
  onBack: () => void;
  onCancel: () => void;
  onApply: (values: string[]) => void;
};

function ValuePicker({
  label,
  initial,
  options,
  isLoading,
  onBack,
  onCancel,
  onApply,
}: ValuePickerProps) {
  const [draft, setDraft] = useState<string[]>(initial);
  const toggle = (value: string) =>
    setDraft((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );

  return (
    <div role="dialog" aria-label={`Filtrar por ${label}`} className={panelClass}>
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-2 border-b border-subtle px-3.5 py-2.5 text-left text-[13px] font-bold"
      >
        <ChevronLeft aria-hidden="true" className="size-4 text-muted-foreground" />
        {label}
      </button>
      <ul className="max-h-[260px] overflow-y-auto py-1">
        {isLoading && options.length === 0 && (
          <li className="px-3.5 py-2 text-[13px] text-muted-foreground">Contando…</li>
        )}
        {options.map((option) => {
          const isOn = draft.includes(option.value);
          return (
            <li key={option.value}>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-subtle',
                  option.count === 0 && !isOn && 'opacity-45',
                )}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(option.value)}
                  className="size-4 accent-[var(--color-primary)]"
                />
                <span className="flex-1">{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(option.count)}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-end gap-2.5 border-t border-subtle px-3.5 py-2.5">
        <span className="flex-1 whitespace-nowrap text-xs text-muted-foreground">
          {draft.length
            ? `${draft.length} ${draft.length > 1 ? 'selecionados' : 'selecionado'}`
            : 'Nenhum selecionado'}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-[13px] font-semibold text-secondary-foreground hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onApply(draft)}
          className="rounded-sm bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
