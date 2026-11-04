import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

type LoadingStateProps = { label?: string };

export function LoadingState({ label = 'Carregando' }: LoadingStateProps) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 px-5 py-12 text-muted-foreground"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-control border-t-primary"
      />
      <span className="text-[13px]">{label}…</span>
    </div>
  );
}

type EmptyStateProps = { title: string; description?: string; action?: ReactNode };

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-md text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

type ErrorStateProps = { message: string; onRetry?: () => void };

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <AlertCircle aria-hidden="true" className="size-6 text-destructive" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

type InlineAlertProps = { children: ReactNode };

export function InlineAlert({ children }: InlineAlertProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-[13px] text-destructive-text"
    >
      {children}
    </div>
  );
}
