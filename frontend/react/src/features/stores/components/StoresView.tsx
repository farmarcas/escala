import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CompletenessCell, ValidationCell } from '@/components/ui/GovernanceCells';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { Pagination } from '@/components/ui/Pagination';
import { SearchField } from '@/components/ui/SearchField';
import { SelectField } from '@/components/ui/SelectField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Cell, HeaderCell, Row, Table, TableFooter } from '@/components/ui/Table';
import { useBrandOptions } from '@/hooks/useBrandOptions';
import {
  formatCnpj,
  formatGroupNumber,
  formatNumber,
  formatStoreCode,
  pluralize,
} from '@/lib/format';
import { UF_OPTIONS } from '@/lib/uf';
import { useStores } from '../hooks/useStores';
import { STORE_STATUS, STORE_TYPE } from '../storeLabels';
import { CompletenessDonut } from './CompletenessDonut';

const share = (part: number, total: number) => (total === 0 ? 0 : (part / total) * 100);
const percent = (part: number, total: number) => `${Math.round(share(part, total))}%`;

export function StoresView() {
  const navigate = useNavigate();
  const list = useStores();
  const brands = useBrandOptions();
  const stats = list.stats;

  return (
    <>
      <PageHeader
        title="Lojas"
        description={
          stats
            ? `${formatNumber(stats.total)} lojas · ${formatNumber(stats.groups)} grupos econômicos. Para cadastrar loja, abra o grupo.`
            : 'Lojas de todos os grupos econômicos.'
        }
      />

      {/* Quatro indicadores e a rosca do preenchimento, que precisa de mais largura. */}
      <KpiGrid className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(300px,1.4fr)]">
        <KpiCard
          label="Lojas na rede"
          value={formatNumber(stats?.total ?? 0)}
          suffix={`${formatNumber(stats?.pdv ?? 0)} PDV · ${formatNumber(stats?.cd ?? 0)} CD`}
          progress={{ percent: share(stats?.active ?? 0, stats?.total ?? 0), tone: 'success' }}
          context={`${formatNumber(stats?.active ?? 0)} ativas (${percent(stats?.active ?? 0, stats?.total ?? 0)})`}
          isLoading={!stats}
        />
        <KpiCard
          label="Validação pendente"
          value={formatNumber(stats?.validationAttention ?? 0)}
          suffix={`de ${formatNumber(stats?.total ?? 0)}`}
          progress={{
            percent: share(stats?.validationAttention ?? 0, stats?.total ?? 0),
            tone: 'warning',
          }}
          context="Vencida ou nunca feita pelo grupo (a cada 6 meses)"
          isWarning={(stats?.validationAttention ?? 0) > 0}
          isLoading={!stats}
          onClick={() => list.toggleFilter('validation', 'attention')}
          isSelected={list.filter.validation === 'attention'}
        />
        <KpiCard
          label="Documentos com alerta"
          value={formatNumber(stats?.docAlerts.docs ?? 0)}
          suffix={`em ${pluralize(stats?.docAlerts.stores ?? 0, 'loja', 'lojas')}`}
          progress={{
            percent: share(stats?.docAlerts.stores ?? 0, stats?.total ?? 0),
            tone: 'danger',
          }}
          context="Vencidos ou vencendo em até 30 dias"
          isLoading={!stats}
          onClick={() => list.toggleFilter('docAlert', 'true')}
          isSelected={list.filter.docAlert === 'true'}
        />
        <KpiCard
          label="Solicitações em andamento"
          value={formatNumber(stats?.openRequests.requests ?? 0)}
          suffix={`em ${pluralize(stats?.openRequests.stores ?? 0, 'loja', 'lojas')}`}
          progress={{
            percent: share(stats?.openRequests.stores ?? 0, stats?.total ?? 0),
            tone: 'info',
          }}
          context="CNPJ, endereço, bandeira e regime"
          isLoading={!stats}
          onClick={() => list.toggleFilter('hasOpenRequest', 'true')}
          isSelected={list.filter.hasOpenRequest === 'true'}
        />
        <CompletenessDonut
          stats={stats}
          selected={list.filter.completeness}
          onSelect={(band) => list.toggleFilter('completeness', band)}
        />
      </KpiGrid>

      <Card as="section" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-4">
          <SearchField
            label="Buscar por loja, cidade, CNPJ, grupo ou código"
            value={list.filter.search}
            onChange={(search) => list.updateFilter({ search })}
            className="max-w-[360px] flex-1"
          />
          <SelectField
            isLabelInline
            label="Filtrar por marca"
            placeholder="Todas"
            options={brands.all.map((brand) => ({ value: brand.id, label: brand.name }))}
            value={list.filter.brandId}
            onChange={(event) => list.updateFilter({ brandId: event.target.value })}
          />
          <SelectField
            isLabelInline
            label="Filtrar por UF"
            placeholder="Todas"
            options={UF_OPTIONS}
            value={list.filter.uf}
            onChange={(event) => list.updateFilter({ uf: event.target.value })}
          />
          <SelectField
            isLabelInline
            label="Filtrar por tipo"
            placeholder="Todos"
            options={[
              { value: 'PDV', label: 'PDV' },
              { value: 'CD', label: 'CD' },
            ]}
            value={list.filter.type}
            onChange={(event) => list.updateFilter({ type: event.target.value })}
          />
          <SelectField
            isLabelInline
            label="Filtrar por status"
            placeholder="Todos"
            options={[
              { value: 'OPERATING', label: 'Em operação' },
              { value: 'ACTIVE', label: 'Ativa' },
              { value: 'PENDING', label: 'Pendente no grupo' },
              { value: 'INACTIVE', label: 'Inativa' },
            ]}
            value={list.filter.status}
            onChange={(event) => list.updateFilter({ status: event.target.value })}
          />
          <SelectField
            isLabelInline
            label="Filtrar por cadastro"
            placeholder="Todos"
            options={[
              { value: 'complete', label: 'Completo' },
              { value: 'partial', label: 'Falta algo' },
              { value: 'low', label: 'Falta muito' },
            ]}
            value={list.filter.completeness}
            onChange={(event) => list.updateFilter({ completeness: event.target.value })}
          />
          <SelectField
            isLabelInline
            label="Filtrar por validação"
            placeholder="Todas"
            options={[
              { value: 'ok', label: 'Em dia' },
              { value: 'due_soon', label: 'Vence em até 30 dias' },
              { value: 'overdue', label: 'Vencida' },
              { value: 'never', label: 'Nunca validada' },
              { value: 'attention', label: 'Vencida ou nunca feita' },
            ]}
            value={list.filter.validation}
            onChange={(event) => list.updateFilter({ validation: event.target.value })}
          />
          <SelectField
            isLabelInline
            label="Filtrar por alerta"
            placeholder="Todos"
            options={[
              { value: 'doc', label: 'Documento vencido ou a vencer' },
              { value: 'request', label: 'Solicitação em andamento' },
            ]}
            value={list.filter.docAlert ? 'doc' : list.filter.hasOpenRequest ? 'request' : ''}
            onChange={(event) =>
              list.updateFilter({
                docAlert: event.target.value === 'doc' ? 'true' : '',
                hasOpenRequest: event.target.value === 'request' ? 'true' : '',
              })
            }
          />
          {list.hasFilters && (
            <Button variant="link" size="sm" onClick={list.clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>

        {list.isLoading && <LoadingState label="Carregando lojas" />}
        {list.error && !list.isLoading && (
          <ErrorState message={list.error.message} onRetry={list.reload} />
        )}
        {!list.isLoading && !list.error && list.stores.length === 0 && (
          <EmptyState
            title="Nenhuma loja encontrada"
            description={
              list.hasFilters ? 'Nenhuma loja atende aos filtros escolhidos.' : undefined
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
        {!list.isLoading && !list.error && list.stores.length > 0 && (
          <Table label="Lojas da rede" minWidth="1380px">
            <thead>
              <tr>
                <HeaderCell>GE</HeaderCell>
                <HeaderCell>Marca</HeaderCell>
                <HeaderCell>Loja</HeaderCell>
                <HeaderCell>Tipo</HeaderCell>
                <HeaderCell>CNPJ</HeaderCell>
                <HeaderCell>Cidade</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Cadastro</HeaderCell>
                <HeaderCell>Validação</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {list.stores.map((store) => {
                const status = STORE_STATUS[store.status];
                const type = STORE_TYPE[store.type];
                return (
                  <Row
                    key={store.id}
                    isDimmed={store.status === 'INACTIVE'}
                    onOpen={() => navigate(`/lojas/${store.code}`)}
                    openLabel={`Abrir ${store.name}`}
                  >
                    <Cell>
                      <Link
                        to={`/grupos/${store.groupNumber}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-mono text-[13px] font-semibold text-primary hover:text-primary-hover"
                        title={store.groupName}
                      >
                        {formatGroupNumber(store.groupNumber)}
                      </Link>
                      <p className="max-w-40 truncate text-xs text-muted-foreground">
                        {store.groupName}
                      </p>
                    </Cell>
                    <Cell>{store.brand.name}</Cell>
                    <Cell className="max-w-72">
                      <p className="truncate font-semibold">{store.name}</p>
                      {store.legalName && (
                        <p className="truncate text-xs text-secondary-foreground">
                          {store.legalName}
                        </p>
                      )}
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatStoreCode(store.code)}
                      </p>
                    </Cell>
                    <Cell>
                      <StatusBadge tone={type.tone} size="sm" title={type.title}>
                        {type.label}
                      </StatusBadge>
                    </Cell>
                    <Cell className="whitespace-nowrap font-mono text-[13px] text-secondary-foreground">
                      {formatCnpj(store.cnpj)}
                    </Cell>
                    <Cell>
                      {store.city}, {store.uf}
                    </Cell>
                    <Cell>
                      <StatusBadge tone={status.tone} title={status.title}>
                        {status.label}
                      </StatusBadge>
                      {store.openRequests > 0 && (
                        <p className="mt-1 text-xs text-warning-text">
                          {store.openRequests}{' '}
                          {store.openRequests === 1 ? 'solicitação' : 'solicitações'}
                        </p>
                      )}
                    </Cell>
                    <Cell>
                      <CompletenessCell {...store.completeness} />
                    </Cell>
                    <Cell>
                      <ValidationCell
                        status={store.validation.status}
                        days={store.validation.days}
                        validatedAt={store.validation.validatedAt}
                      />
                    </Cell>
                  </Row>
                );
              })}
            </tbody>
          </Table>
        )}
        {list.meta && list.meta.total > 0 && (
          <TableFooter>
            <span>
              Exibindo {formatNumber(list.stores.length)} de {formatNumber(list.meta.total)} lojas
            </span>
            <Pagination {...list.meta} onChange={list.setPage} />
          </TableFooter>
        )}
      </Card>
    </>
  );
}
