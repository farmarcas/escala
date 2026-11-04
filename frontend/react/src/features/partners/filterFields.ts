import type { FilterConfig } from '@/hooks/useFilterControls';
import type { FieldValues } from '@/hooks/useFieldFilters';
import { PARTNER_STATUS, TYPE_LABEL } from './labels';
import type { PartnerStatus, PartnerType } from './types';

// Campos do "+ Filtro" da lista de parceiros.
export type PartnerField = 'type' | 'status';
export type PartnerFields = FieldValues<PartnerField>;

export const PARTNER_FILTER: FilterConfig<PartnerField> = {
  resource: '/partners',
  groups: [{ fields: ['type', 'status'] }],
  fieldLabel: { type: 'Tipo', status: 'Situação' },
  valueLabel: (field, value) =>
    field === 'type'
      ? (TYPE_LABEL[value as PartnerType] ?? value)
      : (PARTNER_STATUS[value as PartnerStatus]?.label ?? value),
};

export const PARTNER_SHORTCUTS: { label: string; preset: PartnerFields }[] = [
  { label: 'Indústrias', preset: { type: ['INDUSTRY'] } },
  { label: 'Distribuidores', preset: { type: ['DISTRIBUTOR'] } },
  { label: 'Ativos', preset: { status: ['ACTIVE'] } },
];
