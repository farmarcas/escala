import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { TenantStoresView } from '@/features/tenant-stores';

export function TenantStoresPage() {
  const { identity } = useDemoRole();
  return (
    <PageBody>
      <TenantStoresView groupName={identity.role === 'owner' ? identity.tenantName : ''} />
    </PageBody>
  );
}
