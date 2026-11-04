import { useCallback } from 'react';
import { apiFor } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { ChangeRequest, RequestAction, RequestType, Side } from '../types';

export type NewRequest = {
  type: RequestType;
  values: Record<string, string>;
  effectiveDate?: string;
  justification: string;
  files: Record<string, File>;
};

export function useChangeRequests(side: Side, code: number, onChanged: () => void) {
  const client = apiFor(side);
  const open = useApiQuery<{ data: ChangeRequest[] }>(
    `/stores/${code}/change-requests?status=OPEN`,
    client,
  );
  const reload = open.reload;

  const refresh = useCallback(() => {
    reload();
    onChanged();
  }, [reload, onChanged]);

  // Abre a solicitação e, em seguida, anexa os arquivos escolhidos.
  const create = useCallback(
    async (input: NewRequest) => {
      const created = await client.post<ChangeRequest>(`/stores/${code}/change-requests`, {
        type: input.type,
        values: input.values,
        justification: input.justification,
        ...(input.effectiveDate ? { effectiveDate: input.effectiveDate } : {}),
      });
      for (const [docType, file] of Object.entries(input.files)) {
        await client.upload(`/change-requests/${created.id}/documents`, file, { docType });
      }
      refresh();
    },
    [client, code, refresh],
  );

  const act = useCallback(
    async (request: ChangeRequest, action: RequestAction, note?: string) => {
      await client.post(`/change-requests/${request.id}/actions`, {
        action,
        expectedVersion: request.version,
        ...(note ? { note } : {}),
      });
      refresh();
    },
    [client, refresh],
  );

  const attach = useCallback(
    async (request: ChangeRequest, docType: string, file: File) => {
      await client.upload(`/change-requests/${request.id}/documents`, file, { docType });
      refresh();
    },
    [client, refresh],
  );

  return {
    requests: open.data?.data ?? [],
    isLoading: open.isLoading && !open.data,
    error: open.error,
    reload,
    create,
    act,
    attach,
  };
}
