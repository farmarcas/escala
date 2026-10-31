import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TableFooter } from '@/components/ui/Table';
import { useBrandOptions } from '@/hooks/useBrandOptions';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';
import { useFilterControls } from '@/hooks/useFilterControls';
import { formatNumber, pluralize } from '@/lib/format';
import { SHORTCUTS, storeFilterConfig } from '../filterFields';
import { useStores } from '../hooks/useStores';
import type { Store } from '../types';
import { CompletenessDonut } from './CompletenessDonut';
import { StoresActions, type BulkDone } from './StoresActions';
import { StoresTable } from './StoresTable';

const share = (part: number, total: number) => (total ? (part / total) * 100 : 0);
const percent = (part: number, total: number) => `${Math.round(share(part, total))}%`;

type StoresViewProps = { canEdit: boolean };

// Lista de lojas da rede, no layout do protótipo "Lojas Lista": indicadores clicáveis, rosca do
// cadastro, ações em lote, busca, "+ Filtro" com vários valores, atalhos e etiquetas.
export function StoresView({ canEdit }: StoresViewProps) {
  const list = useStores();
  const brands = useBrandOptions();
  const angels = useEmployeeOptions();
  const stats = list.stats;
  const filters = list.filters;
  // Código da loja → número do grupo (o "Atribuir Anjo" age nos grupos).
  const [selected, setSelected] = useState<Map<number, number>>(new Map());
  const [bulkDone, setBulkDone] = useState<BulkDone | null>(null);

  const config = useMemo(
    () =>
      storeFilterConfig({
        brands: new Map(brands.all.map((brand) => [brand.id, brand.name])),
        angels: new Map(angels.options.map((angel) => [angel.id, angel.name])),
      }),
    [brands.all, angels.options],
  );
  const controls = useFilterControls(config, filters, { search: list.debouncedSearch });

  const toggle = (store: Store) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(store.code)) next.delete(store.code);
      else next.set(store.code, store.groupNumber);
      return next;
    });
  const togglePage = () =>
    setSelected((current) => {
      const next = new Map(current);
      const isAll = list.stores.every((store) => next.has(store.code));
      list.stores.forEach((store) =>
        isAll ? next.delete(store.code) : next.set(store.code, store.groupNumber),
      );
      return next;
    });

  const total = stats?.total ?? 0;
  const groups = stats?.groups ?? 0;
  const docStores = stats?.docAlerts.stores ?? 0;
  const requestStores = stats?.openRequests.stores ?? 0;

  return (
    <>
      <PageHeader
        title="Lojas"
        description={
          stats
            ? `${formatNumber(total)} lojas associadas · ${pluralize(groups, 'grupo econômico', 'grupos econômicos')}. Para cadastrar loja, abra o grupo.`
            : 'Lojas de todos os grupos econômicos.'
        }
      />

      {/* Quatro indicadores e a rosca do preenchimento, que precisa de mais largura. */}
      <KpiGrid className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(300px,1.4fr)]">
        <KpiCard
          label="Lojas associadas"
          value={formatNumber(total)}
          suffix={`${formatNumber(stats?.pdv ?? 0)} PDV · ${formatNumber(stats?.cd ?? 0)} CD`}
          progress={{ percent: share(stats?.activeUnblocked ?? 0, total), tone: 'success' }}
          context={`${formatNumber(stats?.activeUnblocked ?? 0)} ativas e desbloqueadas (${percent(stats?.activeUnblocked ?? 0, total)})`}
          onClick={() => filters.setField('alert', [])}
          isLoading={!stats}
        />
        <KpiCard
          label="Dados desatualizados"
          value={formatNumber(stats?.outdated ?? 0)}
          suffix={`de ${formatNumber(total)}`}
          progress={{ percent: share(stats?.outdated ?? 0, total), tone: 'warning' }}
          context="Sem atualização há mais de 90 dias"
          isWarning={(stats?.outdated ?? 0) > 0}
          onClick={() => filters.toggleSingle('alert', 'outdated')}
          isSelected={filters.isSingle('alert', 'outdated')}
          isLoading={!stats}
        />
        <KpiCard
          label="Documentos com alerta"
          value={formatNumber(stats?.docAlerts.docs ?? 0)}
          suffix={`em ${pluralize(docStores, 'loja', 'lojas')}`}
          progress={{ percent: share(docStores, total), tone: 'danger' }}
          context="Vencidos ou vencendo em até 30 dias"
          isCritical={(stats?.docAlerts.docs ?? 0) > 0}
          onClick={() => filters.toggleSingle('alert', 'doc')}
          isSelected={filters.isSingle('alert', 'doc')}
          isLoading={!stats}
        />
        <KpiCard
          label="Solicitações em andamento"
          value={formatNumber(stats?.openRequests.requests ?? 0)}
          suffix={`em ${pluralize(requestStores, 'loja', 'lojas')}`}
          progress={{ percent: share(requestStores, total), tone: 'info' }}
          context="CNPJ, endereço, bandeira e regime"
          onClick={() => filters.toggleSingle('alert', 'request')}
          isSelected={filters.isSingle('alert', 'request')}
          isLoading={!stats}
        />
        <CompletenessDonut
          stats={stats}
          selected={
            (['complete', 'partial', 'low'] as const).find((band) =>
              filters.isSingle('completeness', band),
            ) ?? ''
          }
          onSelect={(band) => filters.toggleSingle('completeness', band)}
        />
      </KpiGrid>

      <Card as="section">
        <FilterToolbar
          searchLabel="Buscar por nome, CNPJ ou GE"
          search={list.search}
          onSearch={list.setSearch}
          menu={controls.menu}
          tags={controls.tags}
          leading={
            <StoresActions
              selected={selected}
              canEdit={canEdit}
              onDone={(result) => {
                setBulkDone(result);
                setSelected(new Map());
                list.reload();
              }}
            />
          }
          trailing={<ExportCsvButton path={list.exportPath} fileName="lojas" />}
          shortcuts={SHORTCUTS.map((shortcut) => {
            const preset = shortcut.preset;
            return {
              label: shortcut.label,
              hint: shortcut.hint,
              isOn: preset ? filters.isPreset(preset) : false,
              onToggle: preset ? () => filters.togglePreset(preset) : undefined,
            };
          })}
          summary={`Exibindo ${formatNumber(list.meta?.total ?? 0)} de ${formatNumber(total)} lojas`}
        />

        {bulkDone && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-3 border-b border-border bg-success-soft px-5 py-3 text-[13px] text-success-text"
          >
            <span className="flex-1">
              {bulkDone.message}
              {bulkDone.skipped > 0 &&
                ` · ${pluralize(bulkDone.skipped, 'pulada', 'puladas')} (já estavam assim)`}
              .
            </span>
            <Button size="sm" variant="ghost" onClick={() => setBulkDone(null)}>
              Fechar
            </Button>
          </div>
        )}

        {list.isLoading && <LoadingState label="Carregando lojas" />}
        {list.error && !list.isLoading && (
          <ErrorState message={list.error.message} onRetry={list.reload} />
        )}
        {!list.isLoading && !list.error && list.stores.length === 0 && (
          <EmptyState
            title="Nenhuma loja encontrada"
            description="Ajuste a busca ou remova filtros."
            action={
              list.hasFilters && (
                <Button variant="secondary" size="sm" onClick={list.clearFilters}>
                  Limpar filtros
                </Button>
              )
            }
          />
        )}
        {!list.isLoading && !list.error && list.stores.length > 0 && (
          <div
            aria-busy={list.isRefreshing}
            className={list.isRefreshing ? 'opacity-60' : undefined}
          >
            <StoresTable
              stores={list.stores}
              selected={new Set(selected.keys())}
              onToggle={toggle}
              onTogglePage={togglePage}
            />
          </div>
        )}
        {list.meta && list.meta.total > 0 && (
          <TableFooter>
            <span className="flex-1">
              Exibindo {formatNumber(list.stores.length)} de {formatNumber(list.meta.total)} lojas
              {selected.size > 0 && ` · ${pluralize(selected.size, 'selecionada', 'selecionadas')}`}
            </span>
            <Pagination {...list.meta} onChange={list.setPage} />
          </TableFooter>
        )}
      </Card>
    </>
  );
}
