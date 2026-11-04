import { useCallback } from 'react';
import { api, type Paginated } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { Brand, BrandStats, BrandStatus } from '../types';

export function useBrands() {
  const list = useApiQuery<Paginated<Brand>>('/brands?pageSize=100');
  const stats = useApiQuery<BrandStats>('/brands/stats');
  const reloadList = list.reload;
  const reloadStats = stats.reload;

  const refresh = useCallback(() => {
    reloadList();
    reloadStats();
  }, [reloadList, reloadStats]);

  const create = useCallback(
    async (name: string) => {
      await api.post<Brand>('/brands', { name });
      refresh();
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await api.patch<Brand>(`/brands/${id}`, { name });
      refresh();
    },
    [refresh],
  );

  const setStatus = useCallback(
    async (id: string, status: BrandStatus) => {
      await api.patch<Brand>(`/brands/${id}`, { status });
      refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.delete(`/brands/${id}`);
      refresh();
    },
    [refresh],
  );

  return {
    brands: list.data?.data ?? [],
    stats: stats.data,
    isLoading: list.isLoading && !list.data,
    error: list.error,
    reload: refresh,
    create,
    rename,
    setStatus,
    remove,
  };
}
