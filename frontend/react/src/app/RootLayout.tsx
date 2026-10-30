import { Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher, useDemoRole } from '@/features/demo-role';
import { useCrumbs } from './useCrumbs';

export type { RouteHandle } from './useCrumbs';

// Backoffice Farmarcas. O papel "Proprietário do grupo" é levado para a área do grupo.
export function RootLayout() {
  const crumbs = useCrumbs();
  const { isAdmin, isOwner } = useDemoRole();
  if (isOwner) return <Navigate to="/grupo/lojas" replace />;

  return (
    <AppShell
      railTitle="Farmarcas"
      railSubtitle="Operador"
      crumbs={crumbs}
      isReadOnly={!isAdmin}
      account={<RoleSwitcher />}
      mobileNav={<MobileNav />}
    >
      <Outlet />
    </AppShell>
  );
}
