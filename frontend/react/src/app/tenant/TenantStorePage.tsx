import { useParams } from 'react-router-dom';
import { PageBody } from '@/components/layout/PageHeader';
import { StorePageView } from '@/features/store-page';
import { NotFoundPage } from '../NotFoundPage';

export function TenantStorePage() {
  const code = Number(useParams().codigo);
  if (!Number.isInteger(code) || code <= 0) return <NotFoundPage />;
  return (
    <PageBody>
      <StorePageView
        key={code}
        side="tenant"
        code={code}
        backTo="/grupo/lojas"
        backLabel="Voltar para minhas lojas"
      />
    </PageBody>
  );
}
