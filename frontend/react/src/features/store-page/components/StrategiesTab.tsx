import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { BasicEditor } from '../hooks/useBasicEditor';
import type { Catalog } from '../hooks/useCatalog';
import type { StorePage } from '../types';
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

// "Abrir mais horas ou dias · usada no módulo Escala": o que vem depois do "·" vira etiqueta.
function splitDescription(description: string | null) {
  const [text, usage] = (description ?? '').split(' · ');
  return {
    text: text || null,
    usage: usage ? usage.charAt(0).toUpperCase() + usage.slice(1) : null,
  };
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
  const selected = (canToggle && editor.strategies) || page.strategies.map((item) => item.itemId);
  const description = canToggle
    ? 'Marque ou desmarque e salve'
    : page.side === 'platform'
      ? 'Definidas pelo grupo · a Farmarcas vê e não altera · lidas pelo módulo Escala'
      : 'Edite em Editar dados básicos · lidas pelo módulo Escala';

  return (
    <SectionCard title="Estratégias comerciais" description={description} bodyClassName="p-0">
      <ul aria-label="Estratégias comerciais">
        {catalog.byKind('STRATEGY').map((item) => {
          const isOn = selected.includes(item.id);
          const since = page.strategies.find((strategy) => strategy.itemId === item.id)?.since;
          const { text, usage } = splitDescription(item.description);
          return (
            <li key={item.id} className="border-b border-subtle last:border-b-0">
              <label
                className={cn(
                  'flex flex-wrap items-center gap-3 px-5 py-[13px] text-[13px]',
                  canToggle ? 'cursor-pointer hover:bg-background' : 'cursor-default',
                )}
              >
                {canToggle ? (
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
                  </span>
                  {text && <span className="block text-xs text-muted-foreground">{text}</span>}
                </span>
                {isOn && since && (
                  <span className="text-xs text-muted-foreground">desde {formatDate(since)}</span>
                )}
                {isOn && usage && (
                  <span className="rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-bold text-info-text">
                    {usage}
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
