import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectField } from '@/components/ui/SelectField';
import { ErrorState } from '@/components/ui/States';
import { useBrandOptions } from '@/hooks/useBrandOptions';
import { formatNumber, pluralize } from '@/lib/format';
import { UF_OPTIONS } from '@/lib/uf';
import { useOverview } from '../hooks/useOverview';
import { AttentionList } from './AttentionList';
import { ModuleAdoption } from './ModuleAdoption';

const NO_USAGE = 'Disponível quando a plataforma registrar os acessos';
const NO_EMPLOYEES = 'Disponível com o cadastro de funcionários do grupo';

type OverviewViewProps = { canCreateTenant: boolean };

// Visão geral do Backoffice, no layout do protótipo. Dados do cadastro vêm do banco;
// uso, funcionários e módulos licenciados aparecem como "—" até existirem.
export function OverviewView({ canCreateTenant }: OverviewViewProps) {
  const navigate = useNavigate();
  const { filter, updateFilter, overview, isLoading, error, reload } = useOverview();
  const brands = useBrandOptions();
  const groups = overview?.groups;
  const stores = overview?.stores;

  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {overview
            ? `${pluralize(overview.groups.all, 'grupo econômico', 'grupos econômicos')} · ${pluralize(overview.stores.total, 'loja', 'lojas')} (${formatNumber(overview.stores.pdv)} PDV · ${formatNumber(overview.stores.cd)} CD) · dados de uso ainda não registrados`
            : 'Carregando a base de cadastro…'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Período"
            value="7d"
            onChange={() => undefined}
            isDisabled
            title="O período vale para os dados de uso, que ainda não são registrados"
            segments={[
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias' },
              { value: 'quarter', label: 'Trimestre' },
            ]}
          />
          <Button variant="secondary" onClick={() => navigate('/grupos')}>
            Ver grupos econômicos
          </Button>
          {canCreateTenant && (
            <Button
              disabled
              title="Em desenvolvimento: convite do proprietário e liberação de módulos"
            >
              Novo tenant
            </Button>
          )}
        </div>
      </div>

      <Card className="flex flex-wrap items-end gap-4 px-5 py-4">
        <SelectField
          label="Filtrar por marca"
          placeholder="Todas"
          options={brands.all.map((brand) => ({ value: brand.id, label: brand.name }))}
          value={filter.brandId}
          onChange={(event) => updateFilter({ brandId: event.target.value })}
          className="min-w-[170px] flex-1"
        />
        <SelectField
          label="Filtrar por UF"
          placeholder="Todas"
          options={UF_OPTIONS}
          value={filter.uf}
          onChange={(event) => updateFilter({ uf: event.target.value })}
          className="min-w-[150px] flex-1"
        />
        <SelectField
          label="Filtrar por departamento"
          placeholder="Todos"
          options={[]}
          value=""
          disabled
          title={NO_EMPLOYEES}
          className="min-w-[170px] flex-1"
        />
        <p className="min-w-[240px] flex-[2] pb-3 text-xs text-muted-foreground">
          Os filtros se aplicam aos indicadores agregados. Marca conta lojas e funcionários lotados
          em lojas da marca; quem é de escritório não entra.
        </p>
      </Card>

      {error && <ErrorState message={error.message} onRetry={reload} />}

      <KpiGrid>
        <KpiCard
          label="GEs ativos"
          value={formatNumber(groups?.active ?? 0)}
          suffix={`de ${formatNumber(groups?.all ?? 0)}`}
          progress={{
            percent: groups?.all ? (groups.active / groups.all) * 100 : 0,
            tone: 'success',
          }}
          context={`${pluralize(groups?.suspended ?? 0, 'suspenso', 'suspensos')} · ${pluralize(groups?.archived ?? 0, 'arquivado', 'arquivados')} · ${formatNumber(groups?.withoutOwner ?? 0)} sem proprietário`}
          isLoading={isLoading}
        />
        <KpiCard
          label="Tenants ativos no período"
          value="—"
          context={NO_USAGE}
          isUnavailable
          isLoading={isLoading}
        />
        <KpiCard
          label="Taxa de ativação"
          value="—"
          context={`GEs ativos em uso real · ${NO_USAGE.toLowerCase()}`}
          isUnavailable
          isLoading={isLoading}
        />
        <KpiCard
          label="Funcionários ativos"
          value="—"
          context={NO_EMPLOYEES}
          isUnavailable
          isLoading={isLoading}
        />
        <KpiCard
          label="Funcionários que nunca acessaram"
          value="—"
          context={NO_EMPLOYEES}
          isUnavailable
          isLoading={isLoading}
        />
        <KpiCard
          label="Módulos licenciados sem uso"
          value="—"
          suffix="licenças"
          context="Disponível com a liberação de módulos por grupo"
          isUnavailable
          isLoading={isLoading}
        />
      </KpiGrid>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <AttentionList attention={overview?.attention} />
        <ModuleAdoption includedGroups={groups ? groups.all - groups.archived : undefined} />
      </div>

      {stores && stores.total === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma loja no recorte escolhido.</p>
      )}
    </>
  );
}
