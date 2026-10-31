import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { Pagination } from '@/components/ui/Pagination';
import { SearchField } from '@/components/ui/SearchField';
import { SelectField } from '@/components/ui/SelectField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TableFooter } from '@/components/ui/Table';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { useEmployeesList } from '../hooks/useEmployeesList';
import { ACCESS_ROLE_OPTIONS, AREA_OPTIONS } from '../labels';
import type { EmployeeDetail, EmployeeInput } from '../types';
import { EmployeeFormModal } from './EmployeeFormModal';
import { EmployeesKpis } from './EmployeesKpis';
import { EmployeesTable } from './EmployeesTable';

type EmployeesViewProps = { canEdit: boolean };

// Funcionários da Farmarcas (spec 003, US1). Os funcionários dos grupos ficam com cada grupo.
export function EmployeesView({ canEdit }: EmployeesViewProps) {
  const navigate = useNavigate();
  const list = useEmployeesList();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleCreate = async (input: EmployeeInput) => {
    const created = await api.post<EmployeeDetail>('/employees', input);
    navigate(`/funcionarios/${created.id}`);
  };

  return (
    <>
      <PageHeader
        title="Funcionários"
        description="Pessoas da Farmarcas que usam a Radar Suite. O Anjo de cada grupo vem daqui; os funcionários das farmácias ficam com cada grupo."
        actions={
          <>
            <ExportCsvButton path={list.exportPath} fileName="funcionarios" />
            {canEdit && <Button onClick={() => setIsFormOpen(true)}>Novo funcionário</Button>}
          </>
        }
      />

      <EmployeesKpis stats={list.stats} />

      <Card as="section" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-4">
          <SearchField
            label="Buscar por nome, e-mail ou cargo"
            value={list.filter.search}
            onChange={(search) => list.updateFilter({ search })}
            className="max-w-[340px] flex-1"
          />
          <SelectField
            isLabelInline
            label="Filtrar por área"
            placeholder="Todas"
            options={AREA_OPTIONS}
            value={list.filter.area}
            onChange={(event) => list.updateFilter({ area: event.target.value })}
          />
          <SelectField
            isLabelInline
            label="Filtrar por papel"
            placeholder="Todos"
            options={ACCESS_ROLE_OPTIONS}
            value={list.filter.accessRole}
            onChange={(event) => list.updateFilter({ accessRole: event.target.value })}
          />
          <SelectField
            isLabelInline
            label="Filtrar por situação"
            placeholder="Todas"
            options={[
              { value: 'ACTIVE', label: 'Ativos' },
              { value: 'TERMINATED', label: 'Desligados' },
            ]}
            value={list.filter.status}
            onChange={(event) => list.updateFilter({ status: event.target.value })}
          />
        </div>
        {list.isLoading && <LoadingState label="Carregando funcionários" />}
        {list.error && !list.isLoading && (
          <ErrorState message={list.error.message} onRetry={list.reload} />
        )}
        {!list.isLoading && !list.error && list.employees.length === 0 && (
          <EmptyState
            title="Nenhum funcionário encontrado"
            description={
              list.hasFilters ? 'Nenhum funcionário atende aos filtros escolhidos.' : undefined
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
        {!list.isLoading && !list.error && list.employees.length > 0 && (
          <div
            aria-busy={list.isRefreshing}
            className={list.isRefreshing ? 'opacity-60' : undefined}
          >
            <EmployeesTable employees={list.employees} />
          </div>
        )}
        {list.meta && list.meta.total > 0 && (
          <TableFooter>
            <span>
              Exibindo {formatNumber(list.employees.length)} de {formatNumber(list.meta.total)}{' '}
              funcionários · clique na linha para abrir
            </span>
            <Pagination {...list.meta} onChange={list.setPage} />
          </TableFooter>
        )}
      </Card>

      <EmployeeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
