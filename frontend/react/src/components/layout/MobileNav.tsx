import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

type MobileLink = { to: string; label: string; end?: boolean };

const PLATFORM_LINKS: MobileLink[] = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/grupos', label: 'Grupos' },
  { to: '/lojas', label: 'Lojas' },
  { to: '/marcas', label: 'Marcas' },
];

const TENANT_LINKS: MobileLink[] = [{ to: '/grupo/lojas', label: 'Minhas lojas' }];

type MobileNavProps = { variant?: 'platform' | 'tenant' };

// Em telas estreitas o menu lateral vira uma faixa de abas sob o topo.
export function MobileNav({ variant = 'platform' }: MobileNavProps) {
  const links = variant === 'tenant' ? TENANT_LINKS : PLATFORM_LINKS;
  return (
    <nav
      aria-label="Menu principal"
      className="flex gap-1 overflow-x-auto border-b border-border bg-rail px-2 md:hidden"
    >
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cn(
              'whitespace-nowrap px-3 py-2.5 text-[13px] font-medium',
              isActive
                ? 'text-selected-foreground shadow-[inset_0_-2px_0_0_var(--color-primary)]'
                : 'text-secondary-foreground',
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
