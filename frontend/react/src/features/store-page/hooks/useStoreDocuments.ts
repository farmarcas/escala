import { useCallback } from 'react';
import { apiFor, downloadFile } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { Side, StoreDocumentRow } from '../types';

export function useStoreDocuments(side: Side, code: number, onChanged: () => void) {
  const client = apiFor(side);
  const query = useApiQuery<{ data: StoreDocumentRow[] }>(`/stores/${code}/documents`, client);
  const reload = query.reload;

  const upload = useCallback(
    async (docType: string, file: File, validUntil: string) => {
      await client.upload(`/stores/${code}/documents`, file, { docType, validUntil });
      reload();
      onChanged();
    },
    [client, code, reload, onChanged],
  );

  const download = useCallback(
    (documentId: string, fileName: string) =>
      downloadFile(client, `/stores/${code}/documents/${documentId}/file`, fileName),
    [client, code],
  );

  return {
    rows: query.data?.data ?? [],
    isLoading: query.isLoading && !query.data,
    error: query.error,
    reload,
    upload,
    download,
  };
}
