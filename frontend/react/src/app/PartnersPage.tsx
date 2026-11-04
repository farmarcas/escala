import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { PartnersView } from '@/features/partners';

export function PartnersPage() {
  const { canOperate } = useDemoRole();
  return (
    <PageBody>
      <PartnersView canEdit={canOperate} />
    </PageBody>
  );
}
