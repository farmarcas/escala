import { useCallback, useEffect, useState } from 'react';
import { api, toApiError, type ApiClient, type ApiError } from '@/lib/api';
import { useDemoRole } from '@/features/demo-role';

export type ApiQuery<T> = {
  data: T | undefined;
  error: ApiError | null;
  isLoading: boolean;
  reload: () => void;
};

// Busca um recurso da API e refaz a busca quando o caminho ou o papel mudam.
// path null = ainda não há o que buscar. client escolhe o caminho (Farmarcas ou grupo).
export function useApiQuery<T>(path: string | null, client: ApiClient = api): ApiQuery<T> {
  const { identityKey } = useDemoRole();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ data: T | undefined; error: ApiError | null; key: string }>({
    data: undefined,
    error: null,
    key: '',
  });
  const key = path ? `${identityKey}:${version}:${client.base}${path}` : '';

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    client
      .get<T>(path, controller.signal)
      .then((data) => setState({ data, error: null, key }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({ data: previous.data, error: toApiError(error), key }));
        }
      });
    return () => controller.abort();
  }, [path, key, client]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return {
    data: state.data,
    error: state.key === key ? state.error : null,
    isLoading: Boolean(path) && state.key !== key,
    reload,
  };
}
