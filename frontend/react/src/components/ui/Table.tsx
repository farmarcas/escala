import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type TableProps = { label: string; children: ReactNode; minWidth?: string };

// Tabela com rolagem horizontal própria: a página nunca rola de lado.
// "relative" prende ali dentro também os campos escondidos (sr-only) de envio de arquivo.
export function Table({ label, children, minWidth = '960px' }: TableProps) {
  return (
    <div className="relative overflow-x-auto">
      <table aria-label={label} className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

type HeaderCellProps = {
  children?: ReactNode;
  isNumeric?: boolean;
  title?: string;
  className?: string;
};

export function HeaderCell({ children, isNumeric = false, title, className }: HeaderCellProps) {
  return (
    <th
      scope="col"
      title={title}
      className={cn(
        'whitespace-nowrap border-b border-border bg-background px-5 py-3 text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground',
        isNumeric ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

type RowProps = {
  children: ReactNode;
  isDimmed?: boolean;
  onOpen?: () => void;
  openLabel?: string;
};

// Linha clicável abre o detalhe; também abre com Enter para quem usa teclado.
export function Row({ children, isDimmed = false, onOpen, openLabel }: RowProps) {
  return (
    <tr
      tabIndex={onOpen ? 0 : undefined}
      aria-label={openLabel}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (onOpen && event.key === 'Enter') onOpen();
      }}
      className={cn(
        'border-b border-subtle transition-colors duration-150 last:border-b-0',
        onOpen &&
          'cursor-pointer hover:bg-background focus-visible:bg-background focus-visible:outline-none',
        isDimmed && 'opacity-70',
      )}
    >
      {children}
    </tr>
  );
}

type CellProps = { children?: ReactNode; isNumeric?: boolean; className?: string };

export function Cell({ children, isNumeric = false, className }: CellProps) {
  return (
    <td className={cn('px-5 py-3.5 align-middle', isNumeric && 'text-right', className)}>
      {children}
    </td>
  );
}

type TableFooterProps = { children: ReactNode };

export function TableFooter({ children }: TableFooterProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
      {children}
    </div>
  );
}
