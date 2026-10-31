import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { StoresView } from '@/features/stores';

export function StoresPage() {
  const { isAdmin } = useDemoRole();
  return (
    <PageBody>
      <StoresView canEdit={isAdmin} />
    </PageBody>
  );
}
