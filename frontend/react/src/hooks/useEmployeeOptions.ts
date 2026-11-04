import { useApiQuery } from '@/hooks/useApiQuery';
import type { Paginated } from '@/lib/api';

export type EmployeeOption = { id: string; name: string; jobTitle: string; portfolioCount: number };

type EmployeeRow = Omit<EmployeeOption, 'jobTitle'> & {
  status: string;
  occupation: { name: string };
};

// Funcionários ativos da Farmarcas para escolher o Anjo (grupos e lojas). Até 100 pessoas, por nome.
export function useEmployeeOptions() {
  const query = useApiQuery<Paginated<EmployeeRow>>('/employees?status=ACTIVE&pageSize=100');
  return {
    options: (query.data?.data ?? []).map(
      ({ id, name, occupation, portfolioCount }): EmployeeOption => ({
        id,
        name,
        jobTitle: occupation.name,
        portfolioCount,
      }),
    ),
    isLoading: query.isLoading && !query.data,
  };
}
