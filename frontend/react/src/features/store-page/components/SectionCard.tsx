import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

type SectionCardProps = {
  title: ReactNode;
  description?: ReactNode;
  // Faixa à esquerda do título: verde nos dados básicos, cinza nas seções livres.
  tone?: 'basic' | 'free';
  actions?: ReactNode;
  children?: ReactNode;
  bodyClassName?: string;
};

// Cartão de seção do protótipo "Loja Detalhe": título com faixa colorida e o conteúdo abaixo.
export function SectionCard({
  title,
  description,
  tone = 'basic',
  actions,
  children,
  bodyClassName,
}: SectionCardProps) {
  return (
    <Card as="section" className="min-w-0 overflow-hidden">
      <div
        className={cn(
          'flex flex-wrap items-start gap-3 border-b border-border px-5 py-4',
          tone === 'basic'
            ? 'shadow-[inset_4px_0_0_0_var(--color-success)]'
            : 'shadow-[inset_4px_0_0_0_var(--color-muted-foreground)]',
        )}
      >
        <div className="min-w-0 flex-1 basis-56">
          {typeof title === 'string' ? <h2 className="text-base font-semibold">{title}</h2> : title}
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children && <div className={cn('p-5', bodyClassName)}>{children}</div>}
    </Card>
  );
}
