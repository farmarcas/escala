import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { setApiIdentity, type DemoIdentity, type DemoRole } from '@/lib/api';

const STORAGE_KEY = 'backoffice.demoIdentity';

export type DemoRoleContextValue = {
  identity: DemoIdentity;
  role: DemoRole;
  isAdmin: boolean;
  isOwner: boolean;
  // Chave que muda quando o papel ou o grupo mudam (as buscas recomeçam).
  identityKey: string;
  setRole: (role: 'admin' | 'analyst') => void;
  setOwner: (group: { id: string; name: string; number: number }) => void;
};

export const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

function readStoredIdentity(): DemoIdentity {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && 'role' in parsed) {
      const value = parsed as DemoIdentity;
      if (value.role === 'owner' && value.tenantId) return value;
      if (value.role === 'admin' || value.role === 'analyst') return { role: value.role };
    }
  } catch {
    // Sem armazenamento local, começa como administrador.
  }
  return { role: 'admin' };
}

type DemoRoleProviderProps = { children: ReactNode };

// Papel de demonstração (Administrador, Analista ou Proprietário de um grupo). Só serve ao
// ambiente local: em produção o papel e o grupo vêm do provedor de identidade, nunca da tela.
export function DemoRoleProvider({ children }: DemoRoleProviderProps) {
  const [identity, setIdentityState] = useState<DemoIdentity>(() => {
    const stored = readStoredIdentity();
    setApiIdentity(stored);
    return stored;
  });

  const setIdentity = useCallback((next: DemoIdentity) => {
    setApiIdentity(next);
    setIdentityState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sem armazenamento local o papel só vale até recarregar a página.
    }
  }, []);

  const setRole = useCallback((role: 'admin' | 'analyst') => setIdentity({ role }), [setIdentity]);
  const setOwner = useCallback(
    (group: { id: string; name: string; number: number }) =>
      setIdentity({
        role: 'owner',
        tenantId: group.id,
        tenantName: group.name,
        tenantNumber: group.number,
      }),
    [setIdentity],
  );

  const value = useMemo<DemoRoleContextValue>(
    () => ({
      identity,
      role: identity.role,
      isAdmin: identity.role === 'admin',
      isOwner: identity.role === 'owner',
      identityKey: identity.role === 'owner' ? `owner:${identity.tenantId}` : identity.role,
      setRole,
      setOwner,
    }),
    [identity, setRole, setOwner],
  );
  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>;
}
