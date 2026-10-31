import { useState } from 'react';
import { api, downloadFile, toApiError, type ApiError } from '@/lib/api';

// Baixa o CSV de uma lista (spec 003, US7). O nome do arquivo leva a data de hoje.
export function useCsvDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const download = async (path: string, name: string) => {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadFile(api, path, `${name}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading, error };
}
