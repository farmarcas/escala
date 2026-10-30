import { useState, type ReactNode } from 'react';
import { MenuRail, type ShellVariant } from './MenuRail';
import { TopBar, type Crumb } from './TopBar';

const RAIL_KEY = 'backoffice.railCollapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) === 'true';
  } catch {
    return false;
  }
}

type AppShellProps = {
  variant?: ShellVariant;
  railTitle: string;
  railSubtitle: string;
  crumbs: Crumb[];
  isReadOnly: boolean;
  account: ReactNode;
  mobileNav: ReactNode;
  children: ReactNode;
};

export function AppShell({
  variant = 'platform',
  railTitle,
  railSubtitle,
  crumbs,
  isReadOnly,
  account,
  mobileNav,
  children,
}: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  const handleToggle = () => {
    setIsCollapsed((value) => {
      try {
        window.localStorage.setItem(RAIL_KEY, String(!value));
      } catch {
        // Sem armazenamento local, a preferência vale só nesta visita.
      }
      return !value;
    });
  };

  return (
    <div data-side={variant} className="flex min-h-screen bg-background">
      <MenuRail
        isCollapsed={isCollapsed}
        variant={variant}
        title={railTitle}
        subtitle={railSubtitle}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          crumbs={crumbs}
          isReadOnly={isReadOnly}
          account={account}
          isRailCollapsed={isCollapsed}
          onToggleRail={handleToggle}
        />
        {mobileNav}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
