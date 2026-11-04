import { useRef, useState } from 'react';
import { Check, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { useMutation } from '@/hooks/useMutation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { ChangeRequest, RequestAction } from '../types';

const TYPE_COLOR: Record<string, string> = {
  CNPJ: 'border-l-destructive',
  ADDRESS: 'border-l-[var(--color-selected-foreground)]',
  BRAND: 'border-l-warning',
  TAX_REGIME: 'border-l-success',
};

type RequestCardProps = {
  request: ChangeRequest;
  canAttach: boolean;
  onAct: (request: ChangeRequest, action: RequestAction, note?: string) => Promise<void>;
  onAttach: (request: ChangeRequest, docType: string, file: File) => Promise<void>;
};

export function RequestCard({ request, canAttach, onAct, onAttach }: RequestCardProps) {
  const [pending, setPending] = useState<RequestAction | null>(null);
  const [note, setNote] = useState('');
  const { run, isPending, error } = useMutation();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const needsNote = pending === 'reject' || pending === 'contest';

  const handleAction = async (action: RequestAction) => {
    if (action === 'reject' || action === 'contest') {
      setPending(action);
      setNote('');
      return;
    }
    await run(() => onAct(request, action));
  };

  const confirmNote = async () => {
    if (!pending || !note.trim()) return;
    if (await run(() => onAct(request, pending, note.trim()))) setPending(null);
  };

  return (
    <article
      className={cn(
        'rounded-lg border border-l-4 border-border bg-surface p-4',
        TYPE_COLOR[request.type],
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-semibold">{request.title}</h3>
        <StatusBadge tone={request.isMyTurn ? 'warning' : 'neutral'} size="sm">
          {request.isMyTurn
            ? 'Aguarda você'
            : request.waitingFor === 'sistema'
              ? 'Validação automática'
              : `Aguardando ${request.waitingFor ?? '—'}`}
        </StatusBadge>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {request.originLabel} · {formatDate(request.createdAt)} · etapa {request.currentStep + 1} de{' '}
        {request.stepCount}
      </p>

      <dl className="mt-3 grid gap-1.5 text-[13px]">
        {request.values.map((value) => (
          <div key={value.key} className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="text-muted-foreground">{value.label}</dt>
            <dd className="min-w-0 break-words">
              <span className="text-muted-foreground line-through">{value.current ?? '—'}</span>
              <span aria-hidden="true"> → </span>
              <span className="font-semibold">{value.requested}</span>
            </dd>
          </div>
        ))}
        {request.effectiveDate && (
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="text-muted-foreground">Vale a partir de</dt>
            <dd>{formatDate(request.effectiveDate)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-2 rounded-md bg-subtle px-3 py-2 text-xs text-secondary-foreground">
        Motivo: {request.justification}
      </p>

      <ol className="mt-3 flex flex-col">
        {request.steps.map((step, index) => (
          <li key={step.label} className="flex gap-2.5">
            <span className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full border-2 text-[10px] text-surface',
                  step.state === 'done' && 'border-success bg-success',
                  step.state === 'current' && 'border-warning bg-surface',
                  step.state === 'pending' && 'border-control bg-surface',
                )}
              >
                {step.state === 'done' && <Check aria-hidden="true" className="size-3" />}
              </span>
              {index < request.steps.length - 1 && <span className="w-px flex-1 bg-border" />}
            </span>
            <span className="pb-3 text-[13px]">
              <span
                className={cn(
                  step.state === 'current' ? 'font-bold' : 'font-medium',
                  step.state === 'pending' && 'text-muted-foreground',
                )}
              >
                {step.label}
                {step.owner && (
                  <span className="font-normal text-muted-foreground"> · {step.owner}</span>
                )}
              </span>
              {step.state === 'done' && step.doneAt && (
                <span className="block text-xs text-muted-foreground">
                  {formatDate(step.doneAt)} · {step.doneBy}
                </span>
              )}
              {step.state === 'current' && (
                <span className="block text-xs text-muted-foreground">
                  {step.owner === 'sistema'
                    ? 'Verificação na Receita (concluída pela Farmarcas)'
                    : `Aguardando ${step.owner}`}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {request.documents.length > 0 && (
        <div className="mt-1 flex flex-col gap-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground">
            Documentos
          </p>
          {request.documents.map((doc) => (
            <div key={doc.docType} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-full text-[10px] font-bold',
                  doc.attached ? 'bg-success text-surface' : 'bg-warning text-foreground',
                )}
                aria-hidden="true"
              >
                {doc.attached ? '✓' : '!'}
              </span>
              <span className="min-w-0 flex-1">{doc.label}</span>
              {doc.attached ? (
                <span className="text-xs text-muted-foreground">{doc.attached.fileName}</span>
              ) : (
                canAttach && (
                  <>
                    <input
                      ref={(element) => {
                        fileInputs.current[doc.docType] = element;
                      }}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      className="sr-only"
                      aria-label={`Anexar ${doc.label}`}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void run(() => onAttach(request, doc.docType, file));
                        event.target.value = '';
                      }}
                    />
                    <Button
                      variant="link"
                      size="sm"
                      disabled={isPending}
                      onClick={() => fileInputs.current[doc.docType]?.click()}
                    >
                      <Paperclip aria-hidden="true" className="size-3.5" />
                      Anexar
                    </Button>
                  </>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {needsNote && (
        <div className="mt-3 flex flex-col gap-2">
          <TextArea
            label={pending === 'reject' ? 'Motivo da reprovação' : 'Motivo da contestação'}
            isRequired
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPending(null)}>
              Voltar
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={!note.trim() || isPending}
              onClick={confirmNote}
            >
              {pending === 'reject' ? 'Reprovar' : 'Contestar'}
            </Button>
          </div>
        </div>
      )}

      {!needsNote && request.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {request.actions.map((item) => (
            <Button
              key={item.action}
              size="sm"
              disabled={isPending}
              variant={
                item.tone === 'primary'
                  ? 'primary'
                  : item.tone === 'danger'
                    ? 'danger-outline'
                    : 'ghost'
              }
              onClick={() => handleAction(item.action)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
      {error && (
        <div className="mt-3">
          <InlineAlert>{error.message}</InlineAlert>
        </div>
      )}
    </article>
  );
}
