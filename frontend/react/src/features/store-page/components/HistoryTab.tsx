import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TableFooter } from '@/components/ui/Table';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { useStoreHistory, type HistoryFilter } from '../hooks/useStoreHistory';
import type { HistoryRow, Side } from '../types';

const KIND: Record<HistoryRow['kind'], { label: string; tone: BadgeTone; dot: string }> = {
  EDIT: { label: 'Edição', tone: 'success', dot: 'bg-success' },
  REQUEST: { label: 'Solicitação', tone: 'warning', dot: 'bg-warning' },
  DOCUMENT: { label: 'Documento', tone: 'info', dot: 'bg-[var(--color-info-text)]' },
  VALIDATION: { label: 'Validação', tone: 'success', dot: 'bg-success' },
  REMINDER: { label: 'Cobrança', tone: 'brand', dot: 'bg-primary' },
};

type HistoryTabProps = { side: Side; code: number };

// Edições, solicitações, documentos, validações e cobranças. Nunca alterado nem apagado.
export function HistoryTab({ side, code }: HistoryTabProps) {
  const history = useStoreHistory(side, code);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="text-base font-semibold">Histórico da loja</h2>
          <p className="text-xs text-muted-foreground">
            Edições, etapas de solicitações e documentos · visível para a Farmarcas e para o grupo
          </p>
        </div>
        <SegmentedControl<HistoryFilter>
          label="Filtrar histórico"
          value={history.filter}
          onChange={history.setFilter}
          segments={[
            { value: 'all', label: 'Tudo' },
            { value: 'EDIT', label: 'Edições' },
            { value: 'REQUEST', label: 'Solicitações' },
            { value: 'DOCUMENT', label: 'Documentos' },
          ]}
        />
      </div>
      {history.isLoading && <LoadingState label="Carregando histórico" />}
      {history.error && <ErrorState message={history.error.message} onRetry={history.reload} />}
      {!history.isLoading && !history.error && history.rows.length === 0 && (
        <EmptyState
          title="Nada registrado ainda"
          description="Cada mudança na loja aparece aqui."
        />
      )}
      <ol>
        {history.rows.map((row) => {
          const kind = KIND[row.kind];
          return (
            <li
              key={row.id}
              className="grid gap-1 border-b border-subtle px-5 py-3.5 last:border-b-0 sm:grid-cols-[150px_1fr]"
            >
              <time
                dateTime={row.at}
                className="flex items-center gap-2 font-mono text-[13px] text-secondary-foreground"
              >
                <span aria-hidden="true" className={cn('size-2 rounded-full', kind.dot)} />
                {formatDateTime(row.at)}
              </time>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {row.fieldLabel}
                  <StatusBadge tone={kind.tone} size="sm">
                    {kind.label}
                  </StatusBadge>
                </p>
                {(row.oldValue || row.newValue) && (
                  <p className="mt-0.5 text-[13px] break-words">
                    <span className="text-muted-foreground">{row.oldValue ?? '—'}</span>
                    <span aria-hidden="true"> → </span>
                    <span>{row.newValue ?? '—'}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {row.sideLabel} · {row.by}
                </p>
                {row.justification && (
                  <p className="mt-1.5 rounded-md bg-subtle px-3 py-2 text-[13px] text-secondary-foreground">
                    Motivo: {row.justification}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {history.meta && history.meta.total > history.meta.pageSize && (
        <TableFooter>
          <Pagination {...history.meta} onChange={history.setPage} />
        </TableFooter>
      )}
    </div>
  );
}
