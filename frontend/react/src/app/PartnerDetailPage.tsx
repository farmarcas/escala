import { useParams } from 'react-router-dom';
import { PageBody } from '@/components/layout/PageHeader';
import { AuditTrail } from '@/features/audit';
import { useDemoRole } from '@/features/demo-role';
import { PartnerDetailView } from '@/features/partners';

export function PartnerDetailPage() {
  const { id = '' } = useParams();
  const { isAdmin } = useDemoRole();
  return (
    <PageBody>
      <PartnerDetailView
        id={id}
        canEdit={isAdmin}
        renderHistory={(partner) => (
          <AuditTrail
            key={partner.updatedAt}
            path={`/partners/${partner.id}/audit-events`}
            description="Cadastro, alterações, contatos, inativação e reativação. Registros não podem ser alterados nem apagados."
            emptyDescription="Toda alteração no parceiro aparece aqui."
          />
        )}
      />
    </PageBody>
  );
}
