import type { ReactNode } from 'react';

type PageHeaderProps = { title: string; description?: ReactNode; actions?: ReactNode };

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 md:gap-6">
      <div className="min-w-0 flex-1 basis-80">
        <h1 className="text-2xl font-bold tracking-[-0.3px]">{title}</h1>
        {description && <div className="mt-1.5 text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type PageBodyProps = { children: ReactNode };

// Layout fluido: ocupa toda a largura ao lado do menu (regra do projeto, sem max-width).
export function PageBody({ children }: PageBodyProps) {
  return <div className="flex flex-col gap-4 px-4 pb-16 pt-6 md:px-10 md:pt-8">{children}</div>;
}
