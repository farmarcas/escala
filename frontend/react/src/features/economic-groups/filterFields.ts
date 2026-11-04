import type { FilterConfig } from '@/hooks/useFilterControls';
import type { FieldValues } from '@/hooks/useFieldFilters';
import { GROUP_STATUS } from './groupStatus';
import type { GroupStatus } from './types';

// Campos do "+ Filtro" da lista de grupos.
export type GroupField = 'uf' | 'brandId' | 'angelId' | 'status';
export type GroupFields = FieldValues<GroupField>;

// Anjo: NONE = grupo sem Anjo (arquivado não conta).
export const NO_ANGEL = 'NONE';

export type GroupValueLabels = { brands: Map<string, string>; angels: Map<string, string> };

export function groupFilterConfig(labels: GroupValueLabels): FilterConfig<GroupField> {
  return {
    resource: '/economic-groups',
    groups: [
      { title: 'Cadastro', fields: ['uf', 'brandId', 'angelId'] },
      { title: 'Situação', fields: ['status'] },
    ],
    fieldLabel: { uf: 'UF', brandId: 'Marca', angelId: 'Anjo', status: 'Status' },
    valueLabel: (field, value) => {
      if (field === 'brandId') return labels.brands.get(value) ?? 'Marca';
      if (field === 'angelId')
        return value === NO_ANGEL ? 'Sem Anjo' : (labels.angels.get(value) ?? 'Anjo');
      if (field === 'status') return GROUP_STATUS[value as GroupStatus]?.label ?? value;
      return value;
    },
  };
}

export const GROUP_SHORTCUTS: { label: string; preset: GroupFields }[] = [
  { label: 'Ativos', preset: { status: ['ACTIVE'] } },
  { label: 'Suspensos', preset: { status: ['SUSPENDED'] } },
  { label: 'Sem Anjo', preset: { angelId: [NO_ANGEL] } },
];
