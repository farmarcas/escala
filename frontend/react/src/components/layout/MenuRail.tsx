import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ChevronDown,
  Map as MapIcon,
  Handshake,
  LayoutGrid,
  LogOut,
  Store,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export type ShellVariant = 'platform' | 'tenant';

const TENANT_NAV: NavItem[] = [{ to: '/grupo/lojas', label: 'Minhas lojas', icon: Store }];

const NAV: NavItem[] = [
  { to: '/', label: 'Início', icon: MapIcon, end: true },
  { to: '/visao-geral', label: 'Visão geral', icon: BarChart3 },
  { to: '/grupos', label: 'Grupos econômicos', icon: Building2 },
  { to: '/lojas', label: 'Lojas', icon: Store },
  { to: '/marcas', label: 'Marcas Farmarcas', icon: Tag },
  { to: '/funcionarios', label: 'Funcionários', icon: Users },
];

const UPCOMING: Pick<NavItem, 'label' | 'icon'>[] = [{ label: 'Parceiros', icon: Handshake }];

// Módulos do operador Farmarcas. Gestão 360 entra depois (protótipo "Gestão 360").
const PLATFORM_MODULES = [
  { name: 'Backoffice', note: 'Base de cadastro', isAvailable: true },
  { name: 'Gestão 360', note: 'Em desenvolvimento', isAvailable: false },
];

type MenuRailProps = {
  isCollapsed: boolean;
  variant: ShellVariant;
  title: string;
  subtitle: string;
};

export function MenuRail({ isCollapsed, variant, title, subtitle }: MenuRailProps) {
  const isTenant = variant === 'tenant';
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const nav = isTenant ? TENANT_NAV : NAV;
  const upcoming = isTenant ? [] : UPCOMING;
  // No menu escuro do grupo, texto claro; no Backoffice, rail claro.
  const tone = isTenant
    ? {
        border: 'border-white/10',
        text: 'text-white/75',
        hover: 'hover:bg-white/10 hover:text-white',
        active:
          'bg-white/12 font-semibold text-white shadow-[inset_3px_0_0_0_var(--color-primary)]',
        muted: 'text-white/60',
      }
    : {
        border: 'border-border',
        text: 'text-secondary-foreground',
        hover: 'hover:bg-selected hover:text-foreground',
        active: 'bg-selected font-semibold text-selected-foreground',
        muted: 'text-secondary-foreground',
      };
  return (
    <aside
      aria-label="Menu principal"
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r bg-rail transition-[width] duration-150 md:flex',
        tone.border,
        isTenant && 'text-white',
        isCollapsed ? 'w-[72px]' : 'w-[232px]',
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center gap-2.5 border-b px-4',
          tone.border,
          isCollapsed && 'justify-center',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-selected-foreground text-sm font-bold text-[#c7e4ff]"
        >
          F
        </span>
        {!isCollapsed && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">{title}</span>
            <span className={cn('block truncate text-xs leading-tight', tone.muted)}>
              {subtitle}
            </span>
          </span>
        )}
      </div>

      {isTenant ? (
        <div
          className={cn(
            'flex items-center gap-3 border-b px-4 py-3.5 font-semibold',
            tone.border,
            isCollapsed && 'justify-center',
          )}
          title="Cadastros"
        >
          <LayoutGrid aria-hidden={true} className="size-[18px] shrink-0" />
          {!isCollapsed && <span className="text-sm">Cadastros</span>}
        </div>
      ) : (
        <>
          {/* Seletor de módulo do operador (protótipo "Suite Operator"). */}
          <button
            type="button"
            aria-expanded={isModulesOpen}
            aria-controls="module-list"
            title="Trocar de módulo"
            onClick={() => setIsModulesOpen((value) => !value)}
            className={cn(
              'flex items-center gap-3 border-b px-4 py-3.5 text-left font-semibold hover:bg-selected',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              tone.border,
              isCollapsed && 'justify-center',
            )}
          >
            <LayoutGrid aria-hidden={true} className="size-[18px] shrink-0" />
            {isCollapsed ? (
              <span className="sr-only">Backoffice · trocar de módulo</span>
            ) : (
              <>
                <span className="flex-1 text-sm">Backoffice</span>
                <ChevronDown
                  aria-hidden={true}
                  className={cn(
                    'size-4 text-muted-foreground transition-transform',
                    isModulesOpen && 'rotate-180',
                  )}
                />
              </>
            )}
          </button>
          {isModulesOpen && !isCollapsed && (
            <ul
              id="module-list"
              aria-label="Módulos"
              className={cn('border-b bg-surface py-2', tone.border)}
            >
              {PLATFORM_MODULES.map((module) => (
                <li
                  key={module.name}
                  aria-current={module.isAvailable ? 'true' : undefined}
                  aria-disabled={!module.isAvailable || undefined}
                  title={module.isAvailable ? undefined : `${module.name} · Em desenvolvimento`}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5',
                    module.isAvailable ? 'bg-selected' : 'cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'flex-1 whitespace-nowrap text-[13px]',
                      module.isAvailable
                        ? 'font-bold text-foreground'
                        : 'font-medium text-disabled-foreground',
                    )}
                  >
                    {module.name}
                  </span>
                  {module.isAvailable ? (
                    <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                      {module.note}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap rounded-sm border border-dashed border-control px-1.5 text-[10px] text-muted-foreground">
                      {module.note}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <nav className="flex flex-col gap-0.5 py-4">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                isCollapsed && 'justify-center',
                isActive ? tone.active : cn(tone.text, tone.hover),
              )
            }
          >
            <Icon aria-hidden={true} className="size-[18px] shrink-0" />
            {isCollapsed ? <span className="sr-only">{label}</span> : <span>{label}</span>}
          </NavLink>
        ))}

        {upcoming.map(({ label, icon: Icon }) => (
          <div
            key={label}
            title={`${label} · Em desenvolvimento`}
            className={cn(
              'flex items-center gap-3 px-4 py-3 text-sm font-medium text-disabled-foreground',
              isCollapsed && 'justify-center',
            )}
          >
            <Icon aria-hidden={true} className="size-[18px] shrink-0" />
            {isCollapsed ? (
              <span className="sr-only">{label} · Em desenvolvimento</span>
            ) : (
              <>
                <span className="flex-1">{label}</span>
                <span className="whitespace-nowrap rounded-sm border border-dashed border-control px-1.5 text-[10px] text-muted-foreground">
                  Em desenvolvimento
                </span>
              </>
            )}
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      <div className={cn('flex flex-col gap-1 border-t py-2', tone.border)}>
        <div
          title="Sair · disponível com o login"
          className={cn(
            'flex items-center gap-3 px-4 py-3 text-sm font-medium text-disabled-foreground',
            isCollapsed && 'justify-center',
          )}
        >
          <LogOut aria-hidden={true} className="size-[18px]" />
          {isCollapsed ? <span className="sr-only">Sair</span> : <span>Sair</span>}
        </div>
      </div>
    </aside>
  );
}
