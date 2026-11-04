import { useCallback } from 'react';
import { apiFor } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { Side, StorePage } from '../types';

export function useStorePage(side: Side, code: number) {
  const client = apiFor(side);
  const query = useApiQuery<StorePage>(`/stores/${code}`, client);
  const reload = query.reload;

  // Dados básicos e estrutura vão juntos, com a versão que a pessoa abriu.
  const save = useCallback(
    async (changes: Record<string, unknown>, version: number, reason?: string) => {
      await client.patch(`/stores/${code}`, {
        expectedVersion: version,
        ...changes,
        ...(reason ? { reason } : {}),
      });
      reload();
    },
    [client, code, reload],
  );

  const setStrategies = useCallback(
    async (itemIds: string[]) => {
      await client.put(`/stores/${code}/strategies`, { itemIds });
      reload();
    },
    [client, code, reload],
  );

  const setFurniture = useCallback(
    async (itemId: string, quantity: number, tradeQuantity: number) => {
      await client.put(`/stores/${code}/furniture/${itemId}`, { quantity, tradeQuantity });
      reload();
    },
    [client, code, reload],
  );

  // Ferramentas, canais e itens próprios (preenchidos pelo grupo).
  const setTool = useCallback(
    async (itemId: string, uses: boolean, monthlyCostCents: number | null) => {
      await client.put(`/stores/${code}/tools/${itemId}`, { uses, monthlyCostCents });
      reload();
    },
    [client, code, reload],
  );

  const setChannel = useCallback(
    async (itemId: string, uses: boolean, identifier: string | null) => {
      await client.put(`/stores/${code}/channels/${itemId}`, { uses, identifier });
      reload();
    },
    [client, code, reload],
  );

  const setNoExternalTools = useCallback(
    async (value: boolean) => {
      await client.put(`/stores/${code}/no-external-tools`, { value });
      reload();
    },
    [client, code, reload],
  );

  const addCustomEntry = useCallback(
    async (entry: {
      kind: 'EXTERNAL_TOOL' | 'CHANNEL';
      name: string;
      category?: string;
      identifier?: string;
      monthlyCostCents?: number;
    }) => {
      await client.post(`/stores/${code}/custom-entries`, entry);
      reload();
    },
    [client, code, reload],
  );

  const updateCustomEntry = useCallback(
    async (
      entryId: string,
      patch: { identifier?: string | null; monthlyCostCents?: number | null },
    ) => {
      await client.patch(`/stores/${code}/custom-entries/${entryId}`, patch);
      reload();
    },
    [client, code, reload],
  );

  const removeCustomEntry = useCallback(
    async (entryId: string) => {
      await client.delete(`/stores/${code}/custom-entries/${entryId}`);
      reload();
    },
    [client, code, reload],
  );

  const validate = useCallback(
    async (version: number) => {
      await client.post(`/stores/${code}/validation`, { expectedVersion: version });
      reload();
    },
    [client, code, reload],
  );

  const remind = useCallback(async () => {
    await client.post(`/stores/${code}/validation-reminders`, {});
    reload();
  }, [client, code, reload]);

  // Etapa e bloqueio: só a Farmarcas (a API recusa o grupo).
  const changeStage = useCallback(
    async (input: { stage: string; openedAt?: string; justification?: string }) => {
      await client.patch(`/stores/${code}/stage`, input);
      reload();
    },
    [client, code, reload],
  );

  const setBlock = useCallback(
    async (block: boolean, justification: string) => {
      await client.post(`/stores/${code}/${block ? 'block' : 'unblock'}`, { justification });
      reload();
    },
    [client, code, reload],
  );

  return {
    changeStage,
    setBlock,
    page: query.data,
    isLoading: query.isLoading && !query.data,
    error: query.error,
    reload,
    save,
    setStrategies,
    setFurniture,
    setTool,
    setChannel,
    setNoExternalTools,
    addCustomEntry,
    updateCustomEntry,
    removeCustomEntry,
    validate,
    remind,
  };
}
