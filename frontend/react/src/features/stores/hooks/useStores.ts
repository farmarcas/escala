import { useSearchParams } from 'react-router-dom';
import { UFS } from '@/lib/uf';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { FieldValues } from '@/hooks/useFieldFilters';
import { useFilteredList } from '@/hooks/useFilteredList';
import type { Store, StoreStats } from '../types';

// Campos do "+ Filtro" (protótipo Lojas Lista): cada um aceita vários valores, que somam (ou);
// campos diferentes se combinam (e).
export type FilterField =
  | 'brandId'
  | 'uf'
  | 'angelId'
  | 'stage'
  | 'status'
  | 'blocked'
  | 'completeness'
  | 'validation'
  | 'alert';

export type StoreFields = FieldValues<FilterField>;

// Links da Visão geral e do Início chegam com filtro na URL
// (?uf=SP, ?status=OPERATING, ?validacao=attention, ?solicitacao=1, ?documento=1).
function initialFields(params: URLSearchParams): StoreFields {
  const fields: StoreFields = {};
  const uf = UFS.find((value) => value === params.get('uf'));
  if (uf) fields.uf = [uf];
  if (params.get('status')) fields.status = [params.get('status')!];
  if (params.get('validacao')) fields.validation = [params.get('validacao')!];
  const alerts = [
    ...(params.get('documento') ? ['doc'] : []),
    ...(params.get('solicitacao') ? ['request'] : []),
  ];
  if (alerts.length) fields.alert = alerts;
  return fields;
}

export function useStores() {
  const [params] = useSearchParams();
  const { rows, reload, ...list } = useFilteredList<FilterField, Store>('/stores', () =>
    initialFields(params),
  );
  const stats = useApiQuery<StoreStats>('/stores/stats');
  return {
    ...list,
    stores: rows,
    stats: stats.data,
    reload: () => {
      reload();
      stats.reload();
    },
  };
}
