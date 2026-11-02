import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { GroupsView } from '@/features/economic-groups';

export function GroupsPage() {
  const { canOperate } = useDemoRole();
  return (
    <PageBody>
      <GroupsView canEdit={canOperate} />
    </PageBody>
  );
}
