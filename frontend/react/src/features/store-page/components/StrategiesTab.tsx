import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/States';
import { useMutation } from '@/hooks/useMutation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { Catalog } from '../hooks/useCatalog';
import type { StorePage } from '../types';

type StrategiesTabProps = {
  page: StorePage;
  catalog: Catalog;
  onSave: (itemIds: string[]) => Promise<void>;
};

// Estratégias da loja: o grupo define; a Farmarcas vê (M1 RN-C17).
export function StrategiesTab({ page, catalog, onSave }: StrategiesTabProps) {
  const current = page.strategies.map((item) => item.itemId);
  const [draft, setDraft] = useState<string[] | null>(null);
  const { run, isPending, error } = useMutation();
  const canEdit = page.permissions.canEditStrategies;
  const selected = draft ?? current;
  const hasChanges = draft !== null && [...draft].sort().join() !== [...current].sort().join();

  const toggle = (id: string) =>
    setDraft((value) => {
      const base = value ?? current;
      return base.includes(id) ? base.filter((item) => item !== id) : [...base, id];
    });

  const save = async () => {
    if (draft && (await run(() => onSave(draft)))) setDraft(null);
  };

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="text-base font-semibold">Estratégias da loja</h2>
          <p className="text-xs text-muted-foreground">
            {page.side === 'tenant'
              ? 'Marque o que orienta esta loja. A Farmarcas vê as estratégias do grupo.'
              : 'Definidas pelo grupo. A Farmarcas acompanha e não altera.'}
          </p>
        </div>
        {canEdit && draft !== null && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button disabled={!hasChanges || isPending} onClick={save}>
              Salvar
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {catalog.byKind('STRATEGY').map((item) => {
          const isOn = selected.includes(item.id);
          const since = page.strategies.find((strategy) => strategy.itemId === item.id)?.since;
          return (
            <label
              key={item.id}
              className={cn(
                'flex items-start gap-3 rounded-md p-4',
                isOn
                  ? 'border-2 border-primary bg-primary-tint p-[15px]'
                  : 'border border-border bg-surface',
                canEdit ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              {canEdit ? (
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 accent-primary"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex size-4 items-center justify-center rounded-sm border',
                    isOn ? 'border-primary bg-primary text-primary-foreground' : 'border-control',
                  )}
                >
                  {isOn && <Check className="size-3" />}
                </span>
              )}
              <span>
                <span className="block text-sm font-semibold">{item.name}</span>
                <span className="block text-xs text-muted-foreground">{item.description}</span>
                {isOn && since && (
                  <span className="mt-1 block text-xs font-semibold text-secondary-foreground">
                    desde {formatDate(since)}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && <InlineAlert>{error.message}</InlineAlert>}
    </div>
  );
}
