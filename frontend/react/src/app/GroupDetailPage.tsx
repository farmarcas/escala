import { useParams } from 'react-router-dom';
import { PageBody } from '@/components/layout/PageHeader';
import { AuditTrail } from '@/features/audit';
import { useDemoRole } from '@/features/demo-role';
import { GroupDetailView } from '@/features/economic-groups';
import { GroupStoresPanel } from '@/features/stores';
import { NotFoundPage } from './NotFoundPage';

export function GroupDetailPage() {
  const { numero } = useParams();
  const { canOperate } = useDemoRole();
  const number = Number(numero);
  if (!Number.isInteger(number) || number <= 0) return <NotFoundPage />;

  return (
    <PageBody>
      <GroupDetailView
        key={number}
        number={number}
        canEdit={canOperate}
        renderStores={({ group, canEdit, onChanged, isAddingStore, setIsAddingStore }) => (
          <GroupStoresPanel
            group={{
              number: group.number,
              name: group.name,
              isArchived: group.status === 'ARCHIVED',
              pdvCount: group.pdvCount,
              cdCount: group.cdCount,
              storeCount: group.storeCount,
            }}
            canEdit={canEdit}
            onChanged={onChanged}
            isFormOpen={isAddingStore}
            onFormOpenChange={setIsAddingStore}
          />
        )}
        renderAudit={({ group }) => (
          <AuditTrail
            key={group.updatedAt}
            path={`/economic-groups/${group.number}/audit-events`}
          />
        )}
      />
    </PageBody>
  );
}
