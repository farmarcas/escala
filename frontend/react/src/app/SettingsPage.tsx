import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { NoAccess, SettingsView } from '@/features/settings';

export function SettingsPage() {
  const { isAdmin } = useDemoRole();
  return <PageBody>{isAdmin ? <SettingsView /> : <NoAccess />}</PageBody>;
}
