import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TableFooter } from '@/components/ui/Table';
import { useBrandOptions } from '@/hooks/useBrandOptions';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { useGroupsList } from '../hooks/useGroupsList';
import type { GroupDetail, GroupInput } from '../types';
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
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleCreate = async (input: GroupInput) => {
    const created = await api.post<GroupDetail>('/economic-groups', input);
    navigate(`/grupos/${created.number}`);
  };

  return (
    <>
      <PageHeader
        title="Grupos econômicos"
        description="Cadastro de cada GE. O tenant é o próprio GE: lojas, proprietário e auditoria ficam no detalhe do grupo."
        actions={canEdit && <Button onClick={() => setIsFormOpen(true)}>Novo grupo</Button>}
      />

      <GroupsKpis stats={list.stats} />
      <GroupsBreakdown stats={list.stats} />

      <Card as="section" className="overflow-hidden">
        <GroupsToolbar
          filter={list.filter}
          stats={list.stats}
          brands={brands.all}
          onChange={list.updateFilter}
        />
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
            <GroupsTable groups={list.groups} />
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

      <GroupFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
