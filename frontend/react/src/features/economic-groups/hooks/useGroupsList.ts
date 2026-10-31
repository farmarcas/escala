import { useSearchParams } from 'react-router-dom';
import { UFS } from '@/lib/uf';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useFilteredList } from '@/hooks/useFilteredList';
import { NO_ANGEL, type GroupField, type GroupFields } from '../filterFields';
import type { GroupStats, GroupSummary } from '../types';

// Atalhos com filtro na URL: /grupos?uf=SP (Início) e /grupos?semAnjo=1 (Funcionários).
function initialFields(params: URLSearchParams): GroupFields {
  const fields: GroupFields = {};
  const uf = UFS.find((value) => value === params.get('uf'));
  if (uf) fields.uf = [uf];
  if (params.get('semAnjo')) fields.angelId = [NO_ANGEL];
  return fields;
}

export function useGroupsList() {
  const [params] = useSearchParams();
  const { rows, reload, ...list } = useFilteredList<GroupField, GroupSummary>(
    '/economic-groups',
    () => initialFields(params),
  );
  const stats = useApiQuery<GroupStats>('/economic-groups/stats');
  return {
    ...list,
    groups: rows,
    stats: stats.data,
    reload: () => {
      reload();
      stats.reload();
    },
  };
}
