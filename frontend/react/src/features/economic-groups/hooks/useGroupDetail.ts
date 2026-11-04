import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type {
  BenefitCardInput,
  GroupDetail,
  GroupInput,
  OwnerTransferInput,
  StatusAction,
} from '../types';

export function useGroupDetail(number: number | null) {
  const detail = useApiQuery<GroupDetail>(number ? `/economic-groups/${number}` : null);
  const reload = detail.reload;

  const update = useCallback(
    async (changes: Partial<GroupInput>) => {
      if (!number) return;
      await api.patch<GroupDetail>(`/economic-groups/${number}`, changes);
      reload();
    },
    [number, reload],
  );

  const changeStatus = useCallback(
    async (action: StatusAction, justification: string) => {
      if (!number) return;
      await api.post<GroupDetail>(`/economic-groups/${number}/status-changes`, {
        action,
        justification,
      });
      reload();
    },
    [number, reload],
  );

  const setAngel = useCallback(
    async (employeeId: string | null) => {
      if (!number) return;
      await api.put<GroupDetail>(`/economic-groups/${number}/angel`, { employeeId });
      reload();
    },
    [number, reload],
  );

  const transferOwner = useCallback(
    async (input: OwnerTransferInput) => {
      if (!number) return;
      await api.post<GroupDetail>(`/economic-groups/${number}/owner-transfer`, input);
      reload();
    },
    [number, reload],
  );

  const setBenefitCard = useCallback(
    async (input: BenefitCardInput) => {
      if (!number) return;
      await api.put<GroupDetail>(`/economic-groups/${number}/benefit-card`, input);
      reload();
    },
    [number, reload],
  );

  return {
    transferOwner,
    setBenefitCard,
    setAngel,
    group: detail.data,
    isLoading: detail.isLoading && !detail.data,
    error: detail.error,
    reload,
    update,
    changeStatus,
  };
}
