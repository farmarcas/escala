import { PageBody } from '@/components/layout/PageHeader';
import { useDemoRole } from '@/features/demo-role';
import { EmployeesView } from '@/features/employees';

export function EmployeesPage() {
  const { isAdmin } = useDemoRole();
  return (
    <PageBody>
      <EmployeesView canEdit={isAdmin} />
    </PageBody>
  );
}
