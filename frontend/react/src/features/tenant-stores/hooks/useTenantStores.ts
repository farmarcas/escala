import { tenantApi, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { TenantStore } from '../types';

// Lojas do próprio grupo (a API e o banco não devolvem lojas de outro grupo).
export function useTenantStores() {
  const query = useApiQuery<Paginated<TenantStore>>('/stores?pageSize=100', tenantApi);
  return {
    stores: query.data?.data ?? [],
    isLoading: query.isLoading && !query.data,
    error: query.error,
    reload: query.reload,
  };
}
