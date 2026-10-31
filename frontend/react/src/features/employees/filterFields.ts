import type { FilterConfig } from '@/hooks/useFilterControls';
import type { FieldValues } from '@/hooks/useFieldFilters';
import { ACCESS_ROLE_LABEL, AREA_LABEL, EMPLOYEE_STATUS } from './labels';
import type { EmployeeAccessRole, EmployeeArea, EmployeeStatus } from './types';

// Campos do "+ Filtro" da lista de funcionários.
export type EmployeeField = 'area' | 'accessRole' | 'status';
export type EmployeeFields = FieldValues<EmployeeField>;

export const EMPLOYEE_FILTER: FilterConfig<EmployeeField> = {
  resource: '/employees',
  groups: [{ fields: ['area', 'accessRole', 'status'] }],
  fieldLabel: { area: 'Área', accessRole: 'Papel', status: 'Situação' },
  valueLabel: (field, value) => {
    if (field === 'area') return AREA_LABEL[value as EmployeeArea] ?? value;
    if (field === 'accessRole') return ACCESS_ROLE_LABEL[value as EmployeeAccessRole] ?? value;
    return EMPLOYEE_STATUS[value as EmployeeStatus]?.label ?? value;
  },
};

export const EMPLOYEE_SHORTCUTS: { label: string; preset: EmployeeFields }[] = [
  { label: 'Ativos', preset: { status: ['ACTIVE'] } },
  {
    label: 'Com acesso ao Backoffice',
    preset: { accessRole: ['PLATFORM_ADMIN', 'PLATFORM_ANALYST'] },
  },
  { label: 'Desligados', preset: { status: ['TERMINATED'] } },
];
