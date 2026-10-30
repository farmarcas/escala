import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CatalogItem } from '../types';

type CatalogChecklistProps = {
  label: string;
  items: CatalogItem[];
  selected: string[];
  isEditing: boolean;
  onToggle?: (id: string) => void;
};

// Lista de opções do catálogo: em leitura mostra o que está marcado; em edição, todas para marcar.
export function CatalogChecklist({
  label,
  items,
  selected,
  isEditing,
  onToggle,
}: CatalogChecklistProps) {
  const visible = isEditing ? items : items.filter((item) => selected.includes(item.id));
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum informado</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visible.map((item) => {
            const isOn = selected.includes(item.id);
            return (
              <label
                key={item.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium',
                  isOn
                    ? 'border-primary bg-primary-tint text-foreground'
                    : 'border-border bg-surface text-secondary-foreground',
                  isEditing ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => onToggle?.(item.id)}
                    className="accent-primary"
                  />
                ) : (
                  <Check aria-hidden="true" className="size-3.5 text-primary" />
                )}
                {item.name}
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
