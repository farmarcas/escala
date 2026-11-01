import { useState } from 'react';
import { History } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState, ErrorState, InlineAlert, LoadingState } from '@/components/ui/States';
import { AuditTrail } from '@/features/audit/components/AuditTrail';
import { toApiError } from '@/lib/api';
import type { CatalogListConfig } from '../catalogKinds';
import { useCatalogList } from '../hooks/useCatalogList';
import type { CatalogStatus, SettingsCatalogItem } from '../types';
import { CatalogItemModal } from './CatalogItemModal';
import { CatalogItemsTable } from './CatalogItemsTable';
import { DeleteItemModal } from './DeleteItemModal';

const STATUS_SEGMENTS: { value: CatalogStatus; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Desativados' },
  { value: 'all', label: 'Todos' },
];

type CatalogListViewProps = { list: CatalogListConfig };

// Uma lista de Configurações → Atributos da loja (specs/004, US1 a US4).
export function CatalogListView({ list }: CatalogListViewProps) {
  const catalog = useCatalogList(list.slug);
  // null = fechado; 'new' = inclusão; item = alteração.
  const [editing, setEditing] = useState<SettingsCatalogItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SettingsCatalogItem | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Ações da linha (mover, desativar): erro aparece acima da tabela.
  const rowAction = async (item: SettingsCatalogItem, action: () => Promise<unknown>) => {
    setBusyId(item.id);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(toApiError(error).message);
      catalog.reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title={list.label}
        description={list.description}
        actions={
          <>
            <Button
              variant="secondary"
              aria-expanded={isHistoryOpen}
              onClick={() => setIsHistoryOpen((value) => !value)}
            >
              <History aria-hidden="true" className="size-4" />
              Histórico
            </Button>
            <Button onClick={() => setEditing('new')}>{list.newLabel}</Button>
          </>
        }
      />

      {isHistoryOpen && (
        <Card>
          <AuditTrail
            path={`/settings/catalog/${list.slug}/audit-events`}
            description="Quem incluiu, mudou, desativou ou excluiu itens desta lista. Os registros não podem ser alterados nem apagados."
            emptyDescription="Toda mudança nesta lista aparece aqui."
          />
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <SearchField
            label={`Buscar em ${list.label}`}
            value={catalog.search}
            onChange={catalog.setSearch}
            className="flex-1 basis-60"
          />
          <SegmentedControl
            label="Situação"
            segments={STATUS_SEGMENTS}
            value={catalog.status}
            onChange={catalog.setStatus}
          />
        </div>
        {actionError && (
          <div className="px-5 pt-4">
            <InlineAlert>{actionError}</InlineAlert>
          </div>
        )}
        {catalog.isLoading && !catalog.data ? (
          <LoadingState label={`Carregando ${list.label}`} />
        ) : catalog.error ? (
          <ErrorState message={catalog.error.message} onRetry={catalog.reload} />
        ) : catalog.items.length === 0 ? (
          <EmptyState
            title={catalog.isSearching ? 'Nada encontrado' : 'Nenhum item aqui'}
            description={
              catalog.isSearching
                ? 'Tente outra palavra ou mude a situação.'
                : catalog.status === 'inactive'
                  ? 'Nenhum item desativado nesta lista.'
                  : `Inclua o primeiro item em "${list.newLabel}".`
            }
          />
        ) : (
          <CatalogItemsTable
            list={list}
            items={catalog.items}
            canReorder={!catalog.isSearching}
            busyId={busyId}
            onEdit={setEditing}
            onMove={(item, direction) => rowAction(item, () => catalog.move(item, direction))}
            onToggleActive={(item) => rowAction(item, () => catalog.setActive(item, !item.active))}
            onDelete={setDeleting}
          />
        )}
      </Card>
      <p className="text-xs text-muted-foreground">
        A ordem desta lista é a mesma da página da loja. Mudanças valem na hora para todas as lojas
        e entram no histórico.
      </p>

      {editing && (
        <CatalogItemModal
          list={list}
          item={editing === 'new' ? null : editing}
          suggestions={catalog.suggestions}
          onClose={() => setEditing(null)}
          onCreate={catalog.create}
          onUpdate={catalog.update}
          onReload={catalog.reload}
        />
      )}
      {deleting && (
        <DeleteItemModal
          item={deleting}
          onClose={() => setDeleting(null)}
          onDelete={catalog.remove}
          onDeactivate={(item) => catalog.setActive(item, false)}
        />
      )}
    </>
  );
}
