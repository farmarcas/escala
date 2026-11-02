import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type {
  EmployeeDetail,
  EmployeeInput,
  EmployeeOptions,
  EmployeeStatusAction,
  SuiteRole,
  SuiteSystem,
} from '../types';

// Listas de departamento e ocupação e as regras de cada papel (os três papéis leem).
export function useEmployeeOptions() {
  const query = useApiQuery<EmployeeOptions>('/employees/options');
  return { options: query.data, isLoading: query.isLoading && !query.data };
}

export function useEmployeeDetail(id: string) {
  const detail = useApiQuery<EmployeeDetail>(`/employees/${id}`);
  const reload = detail.reload;

  const update = useCallback(
    async (version: number, changes: Partial<EmployeeInput>) => {
      await api.patch<EmployeeDetail>(`/employees/${id}`, { version, ...changes });
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

  const setAccess = useCallback(
    async (system: SuiteSystem, role: SuiteRole | null) => {
      await api.put<EmployeeDetail>(`/employees/${id}/accesses/${system}`, { role });
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
    setAccess,
  };
}
