import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type PillProps = { children: ReactNode; isOutlined?: boolean };

// Etiqueta curta para marcas, UFs e "+N".
export function Pill({ children, isOutlined = false }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-secondary-foreground',
        isOutlined ? 'border border-border bg-surface' : 'bg-subtle',
      )}
    >
      {children}
    </span>
  );
}

type PillListProps = { items: string[]; max?: number; isOutlined?: boolean; emptyLabel?: string };

export function PillList({ items, max = 2, isOutlined = false, emptyLabel = '—' }: PillListProps) {
  if (items.length === 0) return <span className="text-muted-foreground">{emptyLabel}</span>;
  const visible = items.slice(0, max);
  const hidden = items.length - visible.length;
  return (
    <span className="flex flex-wrap gap-1" title={items.join(', ')}>
      {visible.map((item) => (
        <Pill key={item} isOutlined={isOutlined}>
          {item}
        </Pill>
      ))}
      {hidden > 0 && <Pill>+{hidden}</Pill>}
    </span>
  );
}
