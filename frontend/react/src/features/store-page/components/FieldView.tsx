import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { FieldMeta } from '../types';

type FieldViewProps = {
  label: string;
  value: string | null;
  meta?: FieldMeta;
  isLocked?: boolean;
  lockNote?: string;
  isMono?: boolean;
  hint?: string;
  className?: string;
};

// Campo em modo leitura: rótulo, valor e "Alterado em … por …".
export function FieldView({
  label,
  value,
  meta,
  isLocked = false,
  lockNote,
  isMono = false,
  hint,
  className,
}: FieldViewProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-secondary-foreground">
        {isLocked && <Lock aria-hidden="true" className="size-3" />}
        {label}
      </p>
      <p
        className={cn(
          'min-h-12 rounded-md border border-border bg-subtle px-3.5 py-3 text-sm break-words',
          value ? 'text-foreground' : 'text-muted-foreground',
          isMono && 'font-mono text-[13px]',
        )}
      >
        {value || '—'}
      </p>
      {lockNote && <p className="mt-1 text-xs font-semibold text-warning-text">{lockNote}</p>}
      {meta && (
        <p className="mt-1 text-xs text-muted-foreground">
          Alterado em {formatDate(meta.at)} {meta.side === 'PLATFORM' ? 'pela Farmarcas' : 'por'}{' '}
          {meta.by}
        </p>
      )}
      {!meta && hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
