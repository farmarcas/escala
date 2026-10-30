import {
  completenessPercent,
  completenessText,
  validationLabel,
  type ValidationStatus,
} from '@/lib/governance';
import { formatDate } from '@/lib/format';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';

type CompletenessCellProps = { filled: number; total: number; missing?: string[] };

export function CompletenessCell({ filled, total, missing }: CompletenessCellProps) {
  const percent = completenessPercent(filled, total);
  // Ao passar o mouse: quais campos faltam (como no protótipo).
  const hint = missing?.length ? `Falta: ${missing.join(', ')}` : undefined;
  return (
    <div className="flex w-32 flex-col gap-1" title={hint}>
      <span className="text-sm font-semibold">{percent}%</span>
      <ProgressBar percent={percent} label="Preenchimento do cadastro" />
      <span className="text-xs text-muted-foreground">{completenessText(filled, total)}</span>
    </div>
  );
}

type ValidationCellProps = {
  status: ValidationStatus;
  days: number | null;
  validatedAt: string | null;
};

export function ValidationCell({ status, days, validatedAt }: ValidationCellProps) {
  const label = validationLabel(status, days);
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge tone={label.tone} size="sm">
        {label.text}
      </StatusBadge>
      <span className="text-xs text-muted-foreground">
        {validatedAt ? `Validada em ${formatDate(validatedAt)}` : 'Sem validação do grupo'}
      </span>
    </div>
  );
}
