import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const badgeTone = {
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-destructive-soft text-destructive-text',
  neutral: 'bg-subtle text-secondary-foreground',
  info: 'bg-info-soft text-info-text',
  brand: 'bg-primary-soft text-primary-hover',
} as const;

export type BadgeTone = keyof typeof badgeTone;

type StatusBadgeProps = {
  tone: BadgeTone;
  children: ReactNode;
  size?: 'md' | 'sm';
  title?: string;
};

// Status sempre com texto: a cor nunca é o único sinal (Alquimia DS §9).
export function StatusBadge({ tone, children, size = 'md', title }: StatusBadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full font-semibold',
        size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px] font-bold',
        badgeTone[tone],
      )}
    >
      {children}
    </span>
  );
}
