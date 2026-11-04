import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TableFooter } from '@/components/ui/Table';
import { useBrandOptions } from '@/hooks/useBrandOptions';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';
import { api } from '@/lib/api';
import { formatNumber, pluralize } from '@/lib/format';
import { useGroupsList } from '../hooks/useGroupsList';
import type { BulkResult, GroupDetail, GroupInput } from '../types';
import { AngelPickerModal } from './AngelPickerModal';
import { GroupFormModal } from './GroupFormModal';
import { GroupsBreakdown } from './GroupsBreakdown';
import { GroupsKpis } from './GroupsKpis';
import { GroupsTable } from './GroupsTable';
import { GroupsToolbar } from './GroupsToolbar';

type GroupsViewProps = { canEdit: boolean };

export function GroupsView({ canEdit }: GroupsViewProps) {
  const navigate = useNavigate();
  const list = useGroupsList();
  const brands = useBrandOptions();
  const angels = useEmployeeOptions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  const toggle = (number: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  // Marcar todos da página; se já estavam todos marcados, desmarca a página.
  const toggleAll = (numbers: number[]) =>
    setSelected((current) => {
      const next = new Set(current);
      const isAll = numbers.every((number) => next.has(number));
      numbers.forEach((number) => (isAll ? next.delete(number) : next.add(number)));
      return next;
    });

  const handleBulkAngel = async (employeeId: string | null) => {
    if (!employeeId) return;
    const result = await api.post<BulkResult>('/economic-groups/bulk-angel', {
      numbers: [...selected],
      employeeId,
    });
    setBulkResult(result);
    setSelected(new Set());
    list.reload();
  };

  const handleCreate = async (input: GroupInput) => {
    const created = await api.post<GroupDetail>('/economic-groups', input);
    navigate(`/grupos/${created.number}`);
  };

  return (
    <>
      <PageHeader
        title="Grupos econômicos"
        description="Cadastro de cada GE. O tenant é o próprio GE: lojas, proprietário e auditoria ficam no detalhe do grupo."
        actions={
          <>
            <ExportCsvButton path={list.exportPath} fileName="grupos" />
            {canEdit && <Button onClick={() => setIsFormOpen(true)}>Novo grupo</Button>}
          </>
        }
      />

      <GroupsKpis stats={list.stats} />
      <GroupsBreakdown stats={list.stats} />

      <Card as="section" className="overflow-hidden">
        <GroupsToolbar
          filters={list.filters}
          search={list.search}
          debouncedSearch={list.debouncedSearch}
          onSearch={list.setSearch}
          brands={brands.all}
          angels={angels.options}
          shown={list.meta?.total ?? 0}
          total={list.stats?.byStatus.all}
        />
        {canEdit && selected.size > 0 && (
          <div
            role="region"
            aria-label="Ações em lote"
            className="flex flex-wrap items-center gap-3 border-b border-border bg-primary-tint px-5 py-3 text-[13px]"
          >
            <span className="font-semibold">
              {pluralize(selected.size, 'grupo selecionado', 'grupos selecionados')}
            </span>
            <Button size="sm" onClick={() => setIsAssigning(true)}>
              Atribuir Anjo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Limpar seleção
            </Button>
          </div>
        )}
        {bulkResult && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-3 border-b border-border bg-success-soft px-5 py-3 text-[13px] text-success-text"
          >
            <span className="flex-1">
              Anjo atribuído: {pluralize(bulkResult.changed, 'grupo alterado', 'grupos alterados')}
              {bulkResult.skipped > 0 &&
                ` · ${pluralize(bulkResult.skipped, 'pulado', 'pulados')} (arquivado ou já com esse Anjo)`}
              .
            </span>
            <Button size="sm" variant="ghost" onClick={() => setBulkResult(null)}>
              Fechar
            </Button>
          </div>
        )}
        {list.isLoading && <LoadingState label="Carregando grupos" />}
        {list.error && !list.isLoading && (
          <ErrorState message={list.error.message} onRetry={list.reload} />
        )}
        {!list.isLoading && !list.error && list.groups.length === 0 && (
          <EmptyState
            title="Nenhum grupo encontrado"
            description={
              list.hasFilters ? 'Nenhum grupo atende aos filtros escolhidos.' : undefined
            }
            action={
              list.hasFilters && (
                <Button variant="secondary" size="sm" onClick={list.clearFilters}>
                  Limpar filtros
                </Button>
              )
            }
          />
        )}
        {!list.isLoading && !list.error && list.groups.length > 0 && (
          <div
            aria-busy={list.isRefreshing}
            className={list.isRefreshing ? 'opacity-60' : undefined}
          >
            <GroupsTable
              groups={list.groups}
              selection={
                canEdit ? { selected, onToggle: toggle, onToggleAll: toggleAll } : undefined
              }
            />
          </div>
        )}
        {list.meta && list.meta.total > 0 && (
          <TableFooter>
            <span>
              Exibindo {formatNumber(list.groups.length)} de {formatNumber(list.meta.total)} GEs ·
              clique na linha para abrir o grupo e as lojas
            </span>
            <Pagination {...list.meta} onChange={list.setPage} />
          </TableFooter>
        )}
      </Card>

      <AngelPickerModal
        isOpen={isAssigning}
        title="Atribuir Anjo em lote"
        subtitle={pluralize(selected.size, 'grupo selecionado', 'grupos selecionados')}
        onClose={() => setIsAssigning(false)}
        onConfirm={handleBulkAngel}
      />

      <GroupFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
