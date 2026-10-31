import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { EmployeeDetail, EmployeeInput, EmployeeStatusAction } from '../types';

export function useEmployeeDetail(id: string) {
  const detail = useApiQuery<EmployeeDetail>(`/employees/${id}`);
  const reload = detail.reload;

  const update = useCallback(
    async (changes: Partial<EmployeeInput>) => {
      await api.patch<EmployeeDetail>(`/employees/${id}`, changes);
      reload();
    },
    [id, reload],
  );

  const changeStatus = useCallback(
    async (action: EmployeeStatusAction, justification: string) => {
      await api.post<EmployeeDetail>(`/employees/${id}/status`, { action, justification });
      reload();
    },
    [id, reload],
  );

  return {
    employee: detail.data,
    isLoading: detail.isLoading && !detail.data,
    error: detail.error,
    reload,
    update,
    changeStatus,
  };
}
