import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import type { useChangeRequests } from '../hooks/useChangeRequests';
import { RequestCard } from './RequestCard';

type RequestsPanelProps = {
  canAttach: boolean;
  requests: ReturnType<typeof useChangeRequests>;
};

export function RequestsPanel({ canAttach, requests }: RequestsPanelProps) {
  const mine = requests.requests.filter((request) => request.isMyTurn).length;
  return (
    <Card as="section" className="flex flex-col">
      <div className="border-b border-border px-4 py-4">
        <h2 className="text-base font-semibold">Solicitações</h2>
        <p className="text-xs text-muted-foreground">
          {requests.requests.length} em andamento
          {mine > 0 && ` · ${mine} ${mine === 1 ? 'aguarda' : 'aguardam'} você`}
        </p>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {requests.isLoading && <LoadingState label="Carregando solicitações" />}
        {requests.error && (
          <ErrorState message={requests.error.message} onRetry={requests.reload} />
        )}
        {!requests.isLoading && !requests.error && requests.requests.length === 0 && (
          <EmptyState
            title="Nenhuma solicitação em andamento"
            description="Dados sensíveis mudam por solicitação: cada tipo tem etapas próprias."
          />
        )}
        {requests.requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            canAttach={canAttach}
            onAct={requests.act}
            onAttach={requests.attach}
          />
        ))}
        <p className="text-xs text-muted-foreground">
          A etapa atual mostra quem precisa agir: o grupo, a Farmarcas ou o sistema.
        </p>
      </div>
    </Card>
  );
}
