import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { ContactInput, PartnerDetail, PartnerInput, PartnerStatusAction } from '../types';

export function usePartnerDetail(id: string) {
  const detail = useApiQuery<PartnerDetail>(`/partners/${id}`);
  const reload = detail.reload;

  // Cada gravação devolve o parceiro atualizado; a tela recarrega para pegar a trilha nova.
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      await action();
      reload();
    },
    [reload],
  );

  return {
    partner: detail.data,
    isLoading: detail.isLoading && !detail.data,
    error: detail.error,
    reload,
    update: (changes: Partial<PartnerInput>) => run(() => api.patch(`/partners/${id}`, changes)),
    changeStatus: (action: PartnerStatusAction, justification: string) =>
      run(() => api.post(`/partners/${id}/status`, { action, justification })),
    addContact: (input: ContactInput) => run(() => api.post(`/partners/${id}/contacts`, input)),
    updateContact: (contactId: string, input: Partial<ContactInput>) =>
      run(() => api.patch(`/partners/${id}/contacts/${contactId}`, input)),
    removeContact: (contactId: string) =>
      run(() => api.delete(`/partners/${id}/contacts/${contactId}`)),
  };
}
