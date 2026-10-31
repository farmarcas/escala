import { useApiQuery } from '@/hooks/useApiQuery';
import { useFilteredList } from '@/hooks/useFilteredList';
import type { PartnerField } from '../filterFields';
import type { Partner, PartnerStats } from '../types';

export function usePartnersList() {
  const { rows, reload, ...list } = useFilteredList<PartnerField, Partner>('/partners');
  const stats = useApiQuery<PartnerStats>('/partners/stats');
  return {
    ...list,
    partners: rows,
    stats: stats.data,
    reload: () => {
      reload();
      stats.reload();
    },
  };
}
