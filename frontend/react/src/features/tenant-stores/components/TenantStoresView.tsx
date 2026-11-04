import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CompletenessCell, ValidationCell } from '@/components/ui/GovernanceCells';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { completenessPercent } from '@/lib/governance';
import { formatNumber, formatStoreCode } from '@/lib/format';
import { useTenantStores } from '../hooks/useTenantStores';

const STATUS = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  INACTIVE: { label: 'Inativa', tone: 'neutral' },
  PENDING: { label: 'Pendente no grupo', tone: 'warning' },
} as const;

type TenantStoresViewProps = { groupName: string };

export function TenantStoresView({ groupName }: TenantStoresViewProps) {
  const navigate = useNavigate();
  const { stores, isLoading, error, reload } = useTenantStores();
  const pendingValidation = stores.filter((s) => s.validation.status !== 'ok').length;
  const average =
    stores.length === 0
      ? 0
      : Math.round(
          stores.reduce(
            (sum, s) => sum + completenessPercent(s.completeness.filled, s.completeness.total),
            0,
          ) / stores.length,
        );
  const requests = stores.reduce((sum, s) => sum + s.openRequests, 0);
  const docAlerts = stores.reduce((sum, s) => sum + s.docAlerts, 0);

  return (
    <>
      <PageHeader
        title="Minhas lojas"
        description={`${groupName} · mantenha os dados das lojas em dia e valide a cada 6 meses.`}
      />
      <KpiGrid>
        <KpiCard
          label="Lojas"
          value={formatNumber(stores.length)}
          context="Cadastradas pela Farmarcas"
          isLoading={isLoading}
        />
        <KpiCard
          label="Preenchimento"
          value={`${average}%`}
          suffix="média"
          context="Dados básicos, endereço popular e documentos"
          isLoading={isLoading}
        />
        <KpiCard
          label="Validação pendente"
          value={formatNumber(pendingValidation)}
          context="Lojas com validação vencendo, vencida ou nunca feita"
          isCritical={pendingValidation > 0}
          isLoading={isLoading}
        />
        <KpiCard
          label="Solicitações em andamento"
          value={formatNumber(requests)}
          context={`${formatNumber(docAlerts)} documentos com alerta`}
          isLoading={isLoading}
        />
      </KpiGrid>

      <Card as="section" className="overflow-hidden">
        {isLoading && <LoadingState label="Carregando lojas" />}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {!isLoading && !error && stores.length === 0 && (
          <EmptyState
            title="Nenhuma loja cadastrada"
            description="As lojas do grupo são cadastradas pela Farmarcas."
          />
        )}
        {!isLoading && !error && stores.length > 0 && (
          <Table label="Lojas do grupo" minWidth="980px">
            <thead>
              <tr>
                <HeaderCell>Loja</HeaderCell>
                <HeaderCell>Tipo</HeaderCell>
                <HeaderCell>Bandeira</HeaderCell>
                <HeaderCell>Cidade</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Cadastro</HeaderCell>
                <HeaderCell>Validação</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => {
                const status = STATUS[store.status];
                return (
                  <Row
                    key={store.id}
                    isDimmed={store.status === 'INACTIVE' || store.isBlocked}
                    onOpen={
                      store.isBlocked ? undefined : () => navigate(`/grupo/lojas/${store.code}`)
                    }
                    openLabel={store.isBlocked ? undefined : `Abrir ${store.name}`}
                  >
                    <Cell>
                      <p className="font-semibold">{store.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatStoreCode(store.code)}
                      </p>
                    </Cell>
                    <Cell>
                      <StatusBadge tone={store.type === 'CD' ? 'info' : 'neutral'} size="sm">
                        {store.type}
                      </StatusBadge>
                    </Cell>
                    <Cell className="whitespace-nowrap">{store.brand.name}</Cell>
                    <Cell className="whitespace-nowrap">
                      {store.city}, {store.uf}
                    </Cell>
                    <Cell>
                      {store.isBlocked ? (
                        <StatusBadge
                          tone="danger"
                          title="A Farmarcas bloqueou o acesso a esta loja. Fale com o seu Anjo."
                        >
                          Bloqueada
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      )}
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
      </Card>
    </>
  );
}
