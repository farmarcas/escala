import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TableFooter } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/format';
import { useGroupAudit } from '../hooks/useGroupAudit';

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: 'Administrador da plataforma',
  PLATFORM_ANALYST: 'Analista da plataforma',
  SYSTEM: 'Sistema',
};

type AuditTrailProps = { groupNumber: number };

// Trilha append-only do grupo: quem fez o quê, quando e por quê.
export function AuditTrail({ groupNumber }: AuditTrailProps) {
  const audit = useGroupAudit(groupNumber);

  if (audit.isLoading) return <LoadingState label="Carregando auditoria" />;
  if (audit.error) return <ErrorState message={audit.error.message} onRetry={audit.reload} />;
  if (audit.events.length === 0) {
    return (
      <EmptyState
        title="Nenhum registro ainda"
        description="Toda alteração no grupo aparece aqui."
      />
    );
  }

  return (
    <>
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Trilha de auditoria</h2>
        <p className="text-xs text-muted-foreground">
          Registros não podem ser alterados nem apagados. Inclui a consulta do operador aos dados
          pessoais do proprietário.
        </p>
      </div>
      <ol className="flex flex-col">
        {audit.events.map((event) => (
          <li
            key={event.id}
            className="grid gap-1 border-b border-subtle px-5 py-3.5 last:border-b-0 sm:grid-cols-[160px_1fr]"
          >
            <time dateTime={event.at} className="font-mono text-[13px] text-secondary-foreground">
              {formatDateTime(event.at)}
            </time>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{event.summary}</p>
              <p className="text-xs text-muted-foreground">
                {event.actorRole === 'SYSTEM'
                  ? ROLE_LABEL.SYSTEM
                  : `${event.actorSubject} · ${ROLE_LABEL[event.actorRole] ?? event.actorRole}`}
              </p>
              {event.justification && (
                <p className="mt-1.5 rounded-md bg-subtle px-3 py-2 text-[13px] text-secondary-foreground">
                  Justificativa: {event.justification}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {audit.meta && audit.meta.total > audit.meta.pageSize && (
        <TableFooter>
          <Pagination {...audit.meta} onChange={audit.setPage} />
        </TableFooter>
      )}
    </>
  );
}
