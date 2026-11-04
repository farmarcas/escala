import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type KpiCardProps = {
  label: string;
  value: ReactNode;
  suffix?: ReactNode;
  // Todo indicador carrega uma linha de contexto (Alquimia DS §8).
  context: ReactNode;
  isCritical?: boolean;
  // Rótulo em âmbar para indicador de atenção (ex.: cadastro desatualizado).
  isWarning?: boolean;
  isLoading?: boolean;
  // Barra de progresso sob o número (0–100).
  progress?: {
    percent: number;
    tone: 'success' | 'warning' | 'primary' | 'info' | 'neutral' | 'danger';
  };
  // Indicador que ainda não tem dados: número apagado e o aviso do que falta no contexto.
  isUnavailable?: boolean;
  // Card clicável (ex.: filtra a lista pelo alerta); isSelected marca o filtro ligado.
  onClick?: () => void;
  isSelected?: boolean;
};

const progressTone = {
  success: 'bg-success',
  warning: 'bg-warning',
  primary: 'bg-primary',
  info: 'bg-info-text',
  neutral: 'bg-control',
  danger: 'bg-destructive',
} as const;

export function KpiCard({
  label,
  value,
  suffix,
  context,
  isCritical = false,
  isWarning = false,
  isLoading = false,
  progress,
  isUnavailable = false,
  onClick,
  isSelected = false,
}: KpiCardProps) {
  const Element = onClick ? 'button' : 'div';
  return (
    <Element
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': isSelected } : {})}
      className={cn(
        'rounded-lg border bg-surface p-5 text-left shadow-card',
        isSelected ? 'border-primary' : isCritical ? 'border-destructive' : 'border-border',
        onClick &&
          'cursor-pointer transition-colors duration-150 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring',
      )}
    >
      <p
        className={cn(
          'text-xs font-bold uppercase tracking-[0.4px]',
          isWarning ? 'text-warning-text' : 'text-muted-foreground',
        )}
      >
        {label}
      </p>
      {isLoading ? (
        <div aria-hidden="true" className="mt-3 h-8 w-20 animate-pulse rounded-sm bg-subtle" />
      ) : (
        <p className="mt-2 flex items-baseline gap-2">
          <span
            className={cn(
              'text-[28px] font-bold leading-[1.1] tracking-[-0.3px]',
              isCritical && 'text-destructive',
              isUnavailable && 'text-control',
            )}
          >
            {value}
          </span>
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </p>
      )}
      {progress && !isLoading && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
          <div
            className={cn('h-full rounded-full', progressTone[progress.tone])}
            style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
          />
        </div>
      )}
      {isUnavailable && !isLoading && (
        <div
          className="mt-2.5 h-1.5 rounded-full border border-dashed border-control"
          aria-hidden="true"
        />
      )}
      <div className="mt-2 text-xs text-muted-foreground">{context}</div>
    </Element>
  );
}

type KpiGridProps = { children: ReactNode; className?: string };

export function KpiGrid({ children, className }: KpiGridProps) {
  return (
    <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4', className)}>
      {children}
    </div>
  );
}
