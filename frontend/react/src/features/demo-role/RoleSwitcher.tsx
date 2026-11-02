import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { demoApi } from '@/lib/api';
import { formatGroupNumber } from '@/lib/format';
import { useDemoRole } from './useDemoRole';

const PLATFORM_ROLES = [
  {
    value: 'admin',
    label: 'Administrador da plataforma',
    description: 'Tudo, inclusive funcionários, acessos e Configurações',
  },
  {
    value: 'manager',
    label: 'Gestor da plataforma',
    description: 'Opera cadastros e solicitações, sem funcionários e Configurações',
  },
  {
    value: 'analyst',
    label: 'Analista da plataforma',
    description: 'Só lê, dados pseudonimizados',
  },
] as const;

type DemoGroup = { id: string; number: number; name: string };

export function RoleSwitcher() {
  const { identity, setRole, setOwner } = useDemoRole();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState<DemoGroup[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOwner = identity.role === 'owner';

  const title = isOwner ? identity.tenantName : 'Operações Farmarcas';
  const subtitle = isOwner
    ? `Proprietário · GE ${formatGroupNumber(identity.tenantNumber)}`
    : (PLATFORM_ROLES.find((item) => item.value === identity.role)?.label ?? '');

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    demoApi
      .get<{ data: DemoGroup[] }>('/tenants', controller.signal)
      .then((result) => setGroups(result.data))
      .catch(() => setGroups([]));
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      controller.abort();
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const choosePlatform = (role: (typeof PLATFORM_ROLES)[number]['value']) => {
    setRole(role);
    setIsOpen(false);
    if (isOwner) navigate('/');
  };

  const chooseGroup = (group: DemoGroup) => {
    setOwner(group);
    setIsOpen(false);
    navigate('/grupo/lojas');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center gap-3 rounded-sm px-2 py-1 text-left hover:bg-subtle focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="hidden text-right sm:block">
          <span className="block text-[13px] font-semibold leading-tight">{title}</span>
          <span className="block text-xs leading-tight text-muted-foreground">{subtitle}</span>
        </span>
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-hover"
        >
          {isOwner ? 'P' : 'OF'}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Papel de demonstração"
          className="absolute right-0 top-full z-30 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-modal"
        >
          <p className="border-b border-border px-4 py-3 text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
            Papel de demonstração · Farmarcas
          </p>
          {PLATFORM_ROLES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="menuitemradio"
              aria-checked={identity.role === item.value}
              onClick={() => choosePlatform(item.value)}
              className={cn(
                'block w-full px-4 py-3 text-left hover:bg-subtle',
                identity.role === item.value && 'bg-subtle',
              )}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.description}</span>
            </button>
          ))}
          <p className="border-y border-border px-4 py-3 text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
            Proprietário do grupo
          </p>
          {groups.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">Carregando grupos…</p>
          )}
          {groups.map((group) => {
            const isSelected = isOwner && identity.tenantId === group.id;
            return (
              <button
                key={group.id}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => chooseGroup(group)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-subtle',
                  isSelected && 'bg-subtle',
                )}
              >
                <span className="font-mono text-xs text-secondary-foreground">
                  {formatGroupNumber(group.number)}
                </span>
                <span className="text-sm font-medium">{group.name}</span>
              </button>
            );
          })}
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Só no ambiente local. Em produção o papel e o grupo vêm do login.
          </p>
        </div>
      )}
    </div>
  );
}
