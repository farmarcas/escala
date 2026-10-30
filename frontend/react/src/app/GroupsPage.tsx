import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { GroupsView } from '@/features/economic-groups';

export function GroupsPage() {
  const { isAdmin } = useDemoRole();
  return (
    <PageBody>
      <GroupsView canEdit={isAdmin} />
    </PageBody>
  );
}
