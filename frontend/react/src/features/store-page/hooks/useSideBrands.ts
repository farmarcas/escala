import { apiFor, type Paginated, type Side } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

type Brand = { id: string; name: string; status: 'ACTIVE' | 'HISTORICAL' };

// Marcas ativas para a troca de bandeira, pelo caminho de quem está vendo.
export function useSideBrands(side: Side, isEnabled: boolean) {
  const path = side === 'tenant' ? '/brands' : '/brands?pageSize=100&status=ACTIVE';
  const query = useApiQuery<Paginated<Brand> | { data: Brand[] }>(
    isEnabled ? path : null,
    apiFor(side),
  );
  return (query.data?.data ?? []).filter((brand) => brand.status === 'ACTIVE');
}
