import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { BasicEditor } from '../hooks/useBasicEditor';
import type { Catalog } from '../hooks/useCatalog';
import type { StorePage } from '../types';
import { InactiveTag } from './CheckItem';
import { EditBar } from './EditBar';
import { SectionCard } from './SectionCard';
import { FreeSectionCards, StructureSection } from './StructureSection';

type StrategiesTabProps = {
  page: StorePage;
  editor: BasicEditor;
  catalog: Catalog;
  onSave: () => void;
};

// Aba Estratégias (protótipo "Loja Detalhe"): estrutura, funcionamento, serviços, sistema, PBMs,
// estratégias comerciais e seções livres, cada um no seu cartão. Tudo muda em "Editar dados
// básicos", com histórico.
export function StrategiesTab({ page, editor, catalog, onSave }: StrategiesTabProps) {
  return (
    <div>
      <EditBar editor={editor} onSave={onSave} />
      <div className="flex flex-col gap-4 rounded-b-lg bg-background p-4">
        <StructureSection page={page} editor={editor} catalog={catalog} />
        <CommercialStrategies page={page} editor={editor} catalog={catalog} />
        <FreeSectionCards page={page} editor={editor} />
      </div>
    </div>
  );
}

// Estratégias comerciais: o grupo define; a Farmarcas vê e não altera (M1 RN-C17).
function CommercialStrategies({
  page,
  editor,
  catalog,
}: {
  page: StorePage;
  editor: BasicEditor;
  catalog: Catalog;
}) {
  const canToggle = editor.isEditing && page.permissions.canEditStrategies;
  const current = page.strategies.map((item) => item.itemId);
  const selected = (canToggle && editor.strategies) || current;
  const description = canToggle
    ? 'Marque ou desmarque e salve'
    : page.side === 'platform'
      ? 'Definidas pelo grupo · a Farmarcas vê e não altera · lidas pelo módulo Escala'
      : 'Edite em Editar dados básicos · lidas pelo módulo Escala';

  return (
    <SectionCard title="Estratégias comerciais" description={description} bodyClassName="p-0">
      <ul aria-label="Estratégias comerciais">
        {catalog.byKind('STRATEGY', current).map((item) => {
          const isOn = selected.includes(item.id);
          const since = page.strategies.find((strategy) => strategy.itemId === item.id)?.since;
          // Desativada em Configurações: fica para quem já tinha, pode sair, não volta.
          const isLocked = !item.active && !isOn;
          return (
            <li key={item.id} className="border-b border-subtle last:border-b-0">
              <label
                className={cn(
                  'flex flex-wrap items-center gap-3 px-5 py-[13px] text-[13px]',
                  canToggle ? 'cursor-pointer hover:bg-background' : 'cursor-default',
                )}
              >
                {canToggle && !isLocked ? (
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => editor.toggleStrategy(item.id)}
                    className="size-[18px] shrink-0 accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                ) : (
                  <span
                    role="img"
                    aria-label={isOn ? 'Ativa' : 'Não ativa'}
                    className={cn(
                      'flex size-[18px] shrink-0 items-center justify-center rounded-sm border',
                      isOn
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-control bg-surface',
                    )}
                  >
                    {isOn && <Check aria-hidden="true" strokeWidth={3} className="size-3" />}
                  </span>
                )}
                <span className="min-w-[200px] flex-1">
                  <span
                    className={cn(
                      'block font-semibold',
                      isOn ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {item.name}
                    {!item.active && (
                      <span className="ml-2 align-middle">
                        <InactiveTag />
                      </span>
                    )}
                  </span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  )}
                </span>
                {isOn && since && (
                  <span className="text-xs text-muted-foreground">desde {formatDate(since)}</span>
                )}
                {isOn && item.usedByScale && (
                  <span className="rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-bold text-info-text">
                    Usada no módulo Escala
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
