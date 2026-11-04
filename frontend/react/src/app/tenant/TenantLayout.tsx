import { Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { MobileNav } from '@/components/layout/MobileNav';
import { RoleSwitcher, useDemoRole } from '@/features/demo-role';
import { formatGroupNumber } from '@/lib/format';
import { useCrumbs } from '../useCrumbs';

// Suíte do grupo econômico (tenant): menu escuro e ação azul. Só o papel do grupo entra.
export function TenantLayout() {
  const crumbs = useCrumbs();
  const { identity } = useDemoRole();
  if (identity.role !== 'owner') return <Navigate to="/" replace />;

  return (
    <AppShell
      variant="tenant"
      railTitle={identity.tenantName}
      railSubtitle={`GE ${formatGroupNumber(identity.tenantNumber)} · suíte do associado`}
      crumbs={crumbs}
      isReadOnly={false}
      account={<RoleSwitcher />}
      mobileNav={<MobileNav variant="tenant" />}
    >
      <Outlet />
    </AppShell>
  );
}
