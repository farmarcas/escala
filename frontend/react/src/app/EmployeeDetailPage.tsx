import { useParams } from 'react-router-dom';
import { PageBody } from '@/components/layout/PageHeader';
import { AuditTrail } from '@/features/audit';
import { useDemoRole } from '@/features/demo-role';
import { EmployeeProfileView } from '@/features/employees';

export function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const { isAdmin } = useDemoRole();
  return (
    <PageBody>
      <EmployeeProfileView
        id={id}
        canEdit={isAdmin}
        renderHistory={(employee) => (
          <AuditTrail
            key={employee.updatedAt}
            path={`/employees/${employee.id}/audit-events`}
            description="Cadastro, alterações, acessos, desligamento e religamento. Registros não podem ser alterados nem apagados."
            emptyDescription="Toda alteração no cadastro aparece aqui."
          />
        )}
      />
    </PageBody>
  );
}
