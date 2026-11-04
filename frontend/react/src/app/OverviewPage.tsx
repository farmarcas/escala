import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { OverviewView } from '@/features/overview';

export function OverviewPage() {
  const { canOperate } = useDemoRole();
  return (
    <PageBody>
      <OverviewView canCreateTenant={canOperate} />
    </PageBody>
  );
}
