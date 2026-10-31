import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { Pagination } from '@/components/ui/Pagination';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectField } from '@/components/ui/SelectField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TableFooter } from '@/components/ui/Table';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { usePartnersList } from '../hooks/usePartnersList';
import type { PartnerDetail, PartnerInput, TypeFilter } from '../types';
import { PartnerFormModal } from './PartnerFormModal';
import { PartnersTable } from './PartnersTable';

type PartnersViewProps = { canEdit: boolean };

// Parceiros da Farmarcas: indústrias e distribuidores (spec 003, US3).
export function PartnersView({ canEdit }: PartnersViewProps) {
  const navigate = useNavigate();
  const list = usePartnersList();
  const stats = list.stats;
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleCreate = async (input: PartnerInput) => {
    const created = await api.post<PartnerDetail>('/partners', input);
    navigate(`/parceiros/${created.id}`);
  };

  return (
    <>
      <PageHeader
        title="Parceiros"
        description="Indústrias e distribuidores com quem a Farmarcas trabalha, com os contatos comerciais de cada um."
        actions={
          <>
            <ExportCsvButton path={list.exportPath} fileName="parceiros" />
            {canEdit && <Button onClick={() => setIsFormOpen(true)}>Novo parceiro</Button>}
          </>
        }
      />

      <KpiGrid className="sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Parceiros ativos"
          value={formatNumber(stats?.active ?? 0)}
          context={`De ${formatNumber(stats?.byType.all ?? 0)} cadastrados`}
          isLoading={!stats}
        />
        <KpiCard
          label="Indústrias"
          value={formatNumber(stats?.industries ?? 0)}
          context="Ativas"
          onClick={() => list.updateFilter({ type: 'INDUSTRY' })}
          isSelected={list.filter.type === 'INDUSTRY'}
          isLoading={!stats}
        />
        <KpiCard
          label="Distribuidores"
          value={formatNumber(stats?.distributors ?? 0)}
          context="Ativos"
          onClick={() => list.updateFilter({ type: 'DISTRIBUTOR' })}
          isSelected={list.filter.type === 'DISTRIBUTOR'}
          isLoading={!stats}
        />
        <KpiCard
          label="Sem contato principal"
          value={formatNumber(stats?.withoutPrimaryContact ?? 0)}
          context="Parceiros ativos sem ninguém marcado como principal"
          isWarning={(stats?.withoutPrimaryContact ?? 0) > 0}
          isLoading={!stats}
        />
      </KpiGrid>

      <Card as="section" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-4">
          <SegmentedControl<TypeFilter>
            label="Filtrar por tipo"
            value={list.filter.type}
            onChange={(type) => list.updateFilter({ type })}
            segments={[
              { value: 'all', label: 'Todos', count: stats?.byType.all },
              { value: 'INDUSTRY', label: 'Indústrias', count: stats?.byType.industry },
              { value: 'DISTRIBUTOR', label: 'Distribuidores', count: stats?.byType.distributor },
            ]}
          />
          <SearchField
            label="Buscar por nome, razão social ou CNPJ"
            value={list.filter.search}
            onChange={(search) => list.updateFilter({ search })}
            className="max-w-[340px] flex-1"
          />
          <SelectField
            isLabelInline
            label="Filtrar por situação"
            placeholder="Todas"
            options={[
              { value: 'ACTIVE', label: 'Ativos' },
              { value: 'INACTIVE', label: 'Inativos' },
            ]}
            value={list.filter.status}
            onChange={(event) => list.updateFilter({ status: event.target.value })}
          />
        </div>
        {list.isLoading && <LoadingState label="Carregando parceiros" />}
        {list.error && !list.isLoading && (
          <ErrorState message={list.error.message} onRetry={list.reload} />
        )}
        {!list.isLoading && !list.error && list.partners.length === 0 && (
          <EmptyState
            title="Nenhum parceiro encontrado"
            description={
              list.hasFilters ? 'Nenhum parceiro atende aos filtros escolhidos.' : undefined
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
        {!list.isLoading && !list.error && list.partners.length > 0 && (
          <div
            aria-busy={list.isRefreshing}
            className={list.isRefreshing ? 'opacity-60' : undefined}
          >
            <PartnersTable partners={list.partners} />
          </div>
        )}
        {list.meta && list.meta.total > 0 && (
          <TableFooter>
            <span>
              Exibindo {formatNumber(list.partners.length)} de {formatNumber(list.meta.total)}{' '}
              parceiros · clique na linha para abrir
            </span>
            <Pagination {...list.meta} onChange={list.setPage} />
          </TableFooter>
        )}
      </Card>

      <PartnerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
