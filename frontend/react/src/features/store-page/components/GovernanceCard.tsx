import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InlineAlert } from '@/components/ui/States';
import { useMutation } from '@/hooks/useMutation';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { validationLabel } from '../labels';
import type { StorePage } from '../types';

type GovernanceCardProps = {
  page: StorePage;
  isEditing: boolean;
  onValidate: () => Promise<void>;
  onRemind: () => Promise<void>;
};

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CompletenessRing({ percent }: { percent: number }) {
  const tone =
    percent >= 100 ? 'text-success' : percent >= 80 ? 'text-warning' : 'text-destructive';
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="32" cy="32" r={RADIUS} fill="none" strokeWidth="8" className="stroke-subtle" />
      <circle
        cx="32"
        cy="32"
        r={RADIUS}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        stroke="currentColor"
        strokeDasharray={`${(percent / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        className={tone}
      />
    </svg>
  );
}

// Preenchimento do cadastro + validação semestral (spec 002, US4).
export function GovernanceCard({ page, isEditing, onValidate, onRemind }: GovernanceCardProps) {
  const [isListOpen, setIsListOpen] = useState(false);
  const { run, isPending, error } = useMutation();
  const { filled, total, missing, validation } = page.governance;
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  const status = validationLabel(validation.status, validation.days);
  const isComplete = missing.length === 0;
  const canValidate = page.permissions.canValidate && isComplete && !isEditing;

  return (
    <Card
      as="section"
      className={cn(
        'p-5',
        validation.status === 'due_soon' && 'border-l-4 border-l-warning',
        (validation.status === 'overdue' || validation.status === 'never') &&
          'border-l-4 border-l-destructive',
      )}
    >
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-1 basis-80 items-center gap-4">
          <div className="relative">
            <CompletenessRing percent={percent} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {percent}%
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">
              {isComplete
                ? 'Cadastro completo'
                : `Faltam ${missing.length} ${missing.length === 1 ? 'campo' : 'campos'} do cadastro`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {total} itens que o grupo preenche · dados básicos, endereço popular, estrutura,
              serviços, estratégias e documentos
            </p>
            {!isComplete && (
              <button
                type="button"
                onClick={() => setIsListOpen((value) => !value)}
                aria-expanded={isListOpen}
                className="mt-1 text-xs font-semibold text-primary hover:text-primary-hover"
              >
                {isListOpen ? 'Esconder o que falta' : 'Ver o que falta'}
              </button>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground">
              Validação semestral
            </span>
            <StatusBadge tone={status.tone}>{status.text}</StatusBadge>
          </div>
          <p className="text-xs text-muted-foreground">
            {validation.validatedAt
              ? `Validada em ${formatDate(validation.validatedAt)} por ${validation.validatedBy ?? '—'} · próxima até ${validation.dueAt ? formatDate(validation.dueAt) : '—'}`
              : 'O dono do grupo deve revisar e validar os dados a cada 6 meses.'}
          </p>
          {validation.remindedAt && (
            <p className="text-xs font-semibold text-warning-text">
              {page.side === 'tenant'
                ? `A Farmarcas pediu a validação em ${formatDateTime(validation.remindedAt)}`
                : `Cobrança enviada em ${formatDateTime(validation.remindedAt)}`}
            </p>
          )}
        </div>

        <div className="flex items-center">
          {page.permissions.canValidate && (
            <Button
              disabled={!canValidate || isPending}
              title={
                canValidate
                  ? 'Confirma que todos os dados da loja estão corretos'
                  : isEditing
                    ? 'Salve a edição antes de validar'
                    : 'Preencha os campos pendentes antes de validar'
              }
              onClick={() => run(onValidate)}
            >
              Validar dados
            </Button>
          )}
          {page.permissions.canRemind && validation.status !== 'ok' && (
            <Button
              variant="secondary"
              disabled={isPending}
              title="Avisa o proprietário para preencher e validar os dados"
              onClick={() => run(onRemind)}
            >
              Cobrar empresário
            </Button>
          )}
        </div>
      </div>

      {isListOpen && !isComplete && (
        <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-subtle pt-4">
          {missing.map((item) => (
            <li
              key={item}
              className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-text"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <div className="mt-3">
          <InlineAlert>{error.message}</InlineAlert>
        </div>
      )}
    </Card>
  );
}
