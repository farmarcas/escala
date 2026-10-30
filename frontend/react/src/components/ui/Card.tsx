import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = { children: ReactNode; className?: string; as?: 'section' | 'div' };

export function Card({ children, className, as: Element = 'div' }: CardProps) {
  return (
    <Element className={cn('rounded-lg border border-border bg-surface shadow-card', className)}>
      {children}
    </Element>
  );
}

type CardTitleProps = { title: string; description?: string; actions?: ReactNode };

export function CardTitle({ title, description, actions }: CardTitleProps) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
