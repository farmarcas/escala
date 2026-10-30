import { Link } from 'react-router-dom';
import { PageBody } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/States';

export function NotFoundPage() {
  return (
    <PageBody>
      <EmptyState
        title="Página não encontrada"
        description="O endereço não existe no Backoffice."
        action={
          <Link to="/" className="text-sm font-semibold text-primary hover:text-primary-hover">
            Ir para a visão geral
          </Link>
        }
      />
    </PageBody>
  );
}
