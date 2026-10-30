import { useCallback, useState } from 'react';
import { toApiError, type ApiError } from '@/lib/api';

// Envia uma alteração e guarda o erro para mostrar junto do formulário.
// Devolve true quando deu certo, para o chamador fechar o modal ou limpar o campo.
export function useMutation() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
    setIsPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(toApiError(caught));
      return false;
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { run, isPending, error, reset };
}
