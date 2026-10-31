import { useApiQuery } from '@/hooks/useApiQuery';
import type { HomeMap } from '../types';

// Presença da rede por estado, lida do cadastro na hora (GET /home/map).
export function useHomeMap() {
  const query = useApiQuery<HomeMap>('/home/map');
  return {
    map: query.data,
    isLoading: query.isLoading && !query.data,
    error: query.error,
    reload: query.reload,
  };
}
