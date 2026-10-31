import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type FilterShortcut = {
  label: string;
  isOn: boolean;
  onToggle?: () => void;
  // Sem onToggle o atalho fica desligado; a dica explica por quê.
  hint?: string;
};

// Linha "Atalhos" das listas: cada atalho liga (ou desliga) um conjunto de filtros.
export function FilterShortcuts({ shortcuts }: { shortcuts: FilterShortcut[] }) {
  return (
    <div className="flex basis-full flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Atalhos</span>
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.label}
          type="button"
          disabled={!shortcut.onToggle}
          aria-pressed={shortcut.isOn}
          title={shortcut.hint}
          onClick={shortcut.onToggle}
          className={cn(
            'whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            shortcut.isOn
              ? 'border-primary bg-primary-soft text-primary-hover'
              : 'border-border bg-surface text-secondary-foreground hover:border-control',
            !shortcut.onToggle && 'cursor-not-allowed opacity-50',
          )}
        >
          {shortcut.label}
        </button>
      ))}
    </div>
  );
}

export type FilterTag<F extends string> = { field: F; label: string; values: string[] };

export type FilterTagsProps<F extends string> = {
  tags: FilterTag<F>[];
  onEdit: (field: F) => void;
  onRemove: (field: F) => void;
  onClear: () => void;
  // Ex.: "Exibindo 58 de 1.945 lojas".
  summary?: ReactNode;
};

// Mais de três valores: os dois primeiros e "+N".
const valuesText = (values: string[]) =>
  values.length > 3
    ? `${values.slice(0, 2).join(' ou ')} +${values.length - 2}`
    : values.join(' ou ');

// Etiquetas dos filtros ligados: clicar muda o filtro, o "x" remove. Some quando não há filtro.
export function FilterTags<F extends string>({
  tags,
  onEdit,
  onRemove,
  onClear,
  summary,
}: FilterTagsProps<F>) {
  if (tags.length === 0) return null;
  return (
    <div className="flex basis-full flex-wrap items-center gap-2 border-t border-dashed border-border pt-2.5">
      {tags.map((tag) => (
        <span
          key={tag.field}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary bg-primary-soft py-1 pl-2.5 pr-1.5 text-xs"
        >
          <button
            type="button"
            onClick={() => onEdit(tag.field)}
            title="Mudar este filtro"
            className="focus-visible:outline-2 focus-visible:outline-ring"
          >
            <b>{tag.label}:</b> {valuesText(tag.values)}
          </button>
          <button
            type="button"
            onClick={() => onRemove(tag.field)}
            aria-label={`Remover filtro ${tag.label}`}
            title="Remover filtro"
            className="flex size-[18px] items-center justify-center rounded-full text-primary-hover hover:bg-primary/15"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="whitespace-nowrap text-xs font-semibold text-primary hover:text-primary-hover"
      >
        Limpar tudo
      </button>
      <span className="flex-1" />
      {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
    </div>
  );
}
