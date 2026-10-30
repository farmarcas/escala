import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Cell, HeaderCell, Row, Table, TableFooter } from '@/components/ui/Table';
import { formatCnpj, formatDate, formatNumber, formatStoreCode } from '@/lib/format';
import { useGroupStores, type TypeFilter } from '../hooks/useGroupStores';
import { STORE_TYPE } from '../storeLabels';
import type { StoreGroupContext } from '../types';
import { StoreFormModal } from './StoreFormModal';
import { StoreStatusCell } from './StoreStatusCell';

type GroupStoresPanelProps = {
  group: StoreGroupContext;
  canEdit: boolean;
  onChanged: () => void;
  // O formulário pode ser aberto de fora (botão no topo da página do grupo).
  isFormOpen: boolean;
  onFormOpenChange: (value: boolean) => void;
};

export function GroupStoresPanel({
  group,
  canEdit,
  onChanged,
  isFormOpen,
  onFormOpenChange: setIsFormOpen,
}: GroupStoresPanelProps) {
  const navigate = useNavigate();
  const stores = useGroupStores(group.number, onChanged);
  const [addedName, setAddedName] = useState<string | null>(null);
  const canAdd = canEdit && !group.isArchived;
  const isFiltered = stores.type !== 'all' || stores.search !== '';

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0 basis-56">
          <h2 className="text-base font-semibold">Lojas do grupo</h2>
          <p className="text-xs text-muted-foreground">Mantidas pela Farmarcas. O grupo só lê.</p>
        </div>
        <SegmentedControl<TypeFilter>
          label="Filtrar por tipo"
          value={stores.type}
          onChange={stores.setType}
          segments={[
            { value: 'all', label: 'Todas', count: group.storeCount },
            { value: 'PDV', label: 'PDV', count: group.pdvCount },
            { value: 'CD', label: 'CD', count: group.cdCount },
          ]}
        />
        <SearchField
          label="Buscar por CNPJ, nome ou cidade"
          value={stores.search}
          onChange={stores.setSearch}
          className="max-w-[320px] flex-1"
        />
        <div className="flex-1" />
        {canEdit && (
          <Button
            onClick={() => setIsFormOpen(true)}
            disabled={!canAdd}
            title={
              canAdd ? undefined : 'Grupo arquivado não recebe loja nova. Restaure o grupo antes.'
            }
          >
            Adicionar loja
          </Button>
        )}
      </div>

      {addedName && (
        <div
          role="status"
          className="flex items-start gap-2.5 border-b border-border bg-warning-soft px-5 py-3 text-[13px] text-warning-text"
        >
          <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">
            {addedName} adicionada. O grupo recebeu uma pendência para verificar a loja e completar
            os dados estratégicos. Até lá a loja aparece como “Pendente no grupo”.
          </span>
          <button
            type="button"
            onClick={() => setAddedName(null)}
            className="font-semibold hover:underline"
          >
            Fechar
          </button>
        </div>
      )}
      {stores.isLoading && <LoadingState label="Carregando lojas" />}
      {stores.error && !stores.isLoading && (
        <ErrorState message={stores.error.message} onRetry={stores.reload} />
      )}
      {!stores.isLoading && !stores.error && stores.stores.length === 0 && (
        <EmptyState
          title={isFiltered ? 'Nenhuma loja encontrada' : 'Este grupo ainda não tem lojas'}
          description={
            isFiltered
              ? 'Nenhuma loja atende à busca ou ao tipo escolhido.'
              : canAdd
                ? 'Adicione a primeira loja do grupo.'
                : undefined
          }
          action={
            isFiltered ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  stores.setType('all');
                  stores.setSearch('');
                }}
              >
                Limpar filtros
              </Button>
            ) : (
              canAdd && <Button onClick={() => setIsFormOpen(true)}>Adicionar loja</Button>
            )
          }
        />
      )}
      {!stores.isLoading && !stores.error && stores.stores.length > 0 && (
        <Table label={`Lojas do ${group.name}`} minWidth="1180px">
          <thead>
            <tr>
              <HeaderCell>
                <span className="inline-flex items-center gap-1.5">
                  Código
                  <span
                    title="Código oficial da loja: a validar"
                    className="rounded-sm border border-dashed border-control bg-surface px-1 text-[10px] font-medium normal-case tracking-normal"
                  >
                    a validar
                  </span>
                </span>
              </HeaderCell>
              <HeaderCell>Loja</HeaderCell>
              <HeaderCell>Tipo</HeaderCell>
              <HeaderCell>Marca</HeaderCell>
              <HeaderCell>CNPJ</HeaderCell>
              <HeaderCell>Cidade</HeaderCell>
              <HeaderCell>UF</HeaderCell>
              <HeaderCell>Abertura</HeaderCell>
              <HeaderCell>Status</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {stores.stores.map((store) => {
              const type = STORE_TYPE[store.type];
              return (
                <Row
                  key={store.id}
                  isDimmed={store.status === 'INACTIVE'}
                  onOpen={() => navigate(`/lojas/${store.code}`)}
                  openLabel={`Abrir ${store.name}`}
                >
                  <Cell className="whitespace-nowrap font-mono text-[13px] text-secondary-foreground">
                    {formatStoreCode(store.code)}
                  </Cell>
                  <Cell className="min-w-52 font-semibold">{store.name}</Cell>
                  <Cell>
                    <StatusBadge tone={type.tone} size="sm" title={type.title}>
                      {type.label}
                    </StatusBadge>
                  </Cell>
                  <Cell className="whitespace-nowrap">{store.brand.name}</Cell>
                  <Cell className="whitespace-nowrap font-mono text-[13px] text-secondary-foreground">
                    {formatCnpj(store.cnpj)}
                  </Cell>
                  <Cell className="whitespace-nowrap">{store.city}</Cell>
                  <Cell>{store.uf}</Cell>
                  <Cell className="text-secondary-foreground">
                    {store.openedAt ? formatDate(store.openedAt) : '—'}
                  </Cell>
                  <Cell>
                    <StoreStatusCell
                      store={store}
                      canEdit={canAdd}
                      onSetStatus={stores.setStatus}
                    />
                  </Cell>
                </Row>
              );
            })}
          </tbody>
        </Table>
      )}
      {stores.meta && stores.meta.total > 0 && (
        <TableFooter>
          <span>
            Exibindo {formatNumber(stores.stores.length)} de {formatNumber(stores.meta.total)} lojas
          </span>
          <Pagination {...stores.meta} onChange={stores.setPage} />
        </TableFooter>
      )}

      <StoreFormModal
        isOpen={isFormOpen}
        group={group}
        onClose={() => setIsFormOpen(false)}
        onCreate={async (input) => {
          await stores.create(input);
          setAddedName(input.name);
        }}
      />
    </>
  );
}
