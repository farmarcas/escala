import { useApiQuery } from '@/hooks/useApiQuery';
import { useFilteredList } from '@/hooks/useFilteredList';
import type { EmployeeField } from '../filterFields';
import type { Employee, EmployeeStats } from '../types';

export function useEmployeesList() {
  const { rows, reload, ...list } = useFilteredList<EmployeeField, Employee>('/employees');
  const stats = useApiQuery<EmployeeStats>('/employees/stats');
  return {
    ...list,
    employees: rows,
    stats: stats.data,
    reload: () => {
      reload();
      stats.reload();
    },
  };
}
