import { PageBody, PageHeader } from '@/components/layout/PageHeader';
import { BrandsView } from '@/features/brands';
import { useDemoRole } from '@/features/demo-role';

export function BrandsPage() {
  const { isAdmin } = useDemoRole();
  return (
    <PageBody>
      <PageHeader
        title="Marcas Farmarcas"
        description="A marca é atributo da loja. Só marcas ativas aparecem no cadastro de loja; um grupo pode ter lojas de marcas diferentes."
      />
      <BrandsView canEdit={isAdmin} />
    </PageBody>
  );
}
