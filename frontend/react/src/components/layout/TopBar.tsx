import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import { usePageTitleValue } from './PageTitle';

export type Crumb = { label: string; to?: string };

type TopBarProps = {
  crumbs: Crumb[];
  isReadOnly: boolean;
  account: ReactNode;
  isRailCollapsed: boolean;
  onToggleRail: () => void;
};

export function TopBar({
  crumbs,
  isReadOnly,
  account,
  isRailCollapsed,
  onToggleRail,
}: TopBarProps) {
  // Na tela de detalhe, o último item mostra o nome (ex.: "Grupo Aurora Norte") em vez do código.
  const pageTitle = usePageTitleValue();
  const items = pageTitle
    ? crumbs.map((crumb, index) =>
        index === crumbs.length - 1 ? { ...crumb, label: pageTitle } : crumb,
      )
    : crumbs;
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface px-4 md:px-10">
      {/* Recolher e expandir o menu lateral, à esquerda do caminho (protótipo). */}
      <button
        type="button"
        onClick={onToggleRail}
        aria-label={isRailCollapsed ? 'Expandir menu' : 'Recolher menu'}
        title={isRailCollapsed ? 'Expandir menu' : 'Recolher menu'}
        className="hidden rounded-sm p-1.5 text-secondary-foreground hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:inline-flex"
      >
        <PanelLeft aria-hidden="true" className="size-5" />
      </button>
      <nav aria-label="Você está em" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2 text-sm">
          {items.map((crumb, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
                {index > 0 && (
                  <span aria-hidden="true" className="text-control">
                    /
                  </span>
                )}
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="truncate text-muted-foreground hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={isLast ? 'truncate font-semibold' : 'truncate text-muted-foreground'}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {isReadOnly && (
        <span className="hidden whitespace-nowrap rounded-full border border-border bg-subtle px-2.5 py-1 text-xs font-semibold text-secondary-foreground sm:inline">
          Somente leitura
        </span>
      )}
      {account}
    </header>
  );
}
