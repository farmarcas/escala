import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { Pagination } from '@/components/ui/Pagination';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TableFooter } from '@/components/ui/Table';
import { useFilterControls } from '@/hooks/useFilterControls';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { usePartnersList } from '../hooks/usePartnersList';
import { PARTNER_FILTER, PARTNER_SHORTCUTS } from '../filterFields';
import type { PartnerDetail, PartnerInput } from '../types';
import { PartnerFormModal } from './PartnerFormModal';
import { PartnersTable } from './PartnersTable';

type PartnersViewProps = { canEdit: boolean };

// Parceiros da Farmarcas: indústrias e distribuidores (spec 003, US3).
export function PartnersView({ canEdit }: PartnersViewProps) {
  const navigate = useNavigate();
  const list = usePartnersList();
  const controls = useFilterControls(PARTNER_FILTER, list.filters, {
    search: list.debouncedSearch,
  });
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
          onClick={() => list.filters.toggleSingle('type', 'INDUSTRY')}
          isSelected={list.filters.isSingle('type', 'INDUSTRY')}
          isLoading={!stats}
        />
        <KpiCard
          label="Distribuidores"
          value={formatNumber(stats?.distributors ?? 0)}
          context="Ativos"
          onClick={() => list.filters.toggleSingle('type', 'DISTRIBUTOR')}
          isSelected={list.filters.isSingle('type', 'DISTRIBUTOR')}
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
        <FilterToolbar
          searchLabel="Buscar por nome, razão social ou CNPJ"
          search={list.search}
          onSearch={list.setSearch}
          menu={controls.menu}
          tags={controls.tags}
          shortcuts={PARTNER_SHORTCUTS.map((shortcut) => ({
            label: shortcut.label,
            isOn: list.filters.isPreset(shortcut.preset),
            onToggle: () => list.filters.togglePreset(shortcut.preset),
          }))}
          summary={`Exibindo ${formatNumber(list.meta?.total ?? 0)} parceiros`}
        />
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
