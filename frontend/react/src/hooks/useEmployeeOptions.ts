import { useApiQuery } from '@/hooks/useApiQuery';
import type { Paginated } from '@/lib/api';

export type EmployeeOption = { id: string; name: string; jobTitle: string; portfolioCount: number };

type EmployeeRow = EmployeeOption & { status: string };

// Funcionários ativos da Farmarcas para escolher o Anjo (grupos e lojas). Até 100 pessoas, por nome.
export function useEmployeeOptions() {
  const query = useApiQuery<Paginated<EmployeeRow>>('/employees?status=ACTIVE&pageSize=100');
  return {
    options: (query.data?.data ?? []).map(
      ({ id, name, jobTitle, portfolioCount }): EmployeeOption => ({
        id,
        name,
        jobTitle,
        portfolioCount,
      }),
    ),
    isLoading: query.isLoading && !query.data,
  };
}
