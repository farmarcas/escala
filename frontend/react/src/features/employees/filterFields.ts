import type { FilterConfig } from '@/hooks/useFilterControls';
import type { FieldValues } from '@/hooks/useFieldFilters';
import { EMPLOYEE_STATUS, accessLabel } from './labels';
import type { EmployeeStatus } from './types';

// Campos do "+ Filtro" da lista de funcionários (spec 005: departamento e sistema e papel).
export type EmployeeField = 'department' | 'access' | 'status';
export type EmployeeFields = FieldValues<EmployeeField>;

// O nome do departamento vem das listas de Configurações (o filtro guarda o id).
export const employeeFilter = (
  departmentName: (id: string) => string | undefined,
): FilterConfig<EmployeeField> => ({
  resource: '/employees',
  groups: [{ fields: ['department', 'access', 'status'] }],
  fieldLabel: { department: 'Departamento', access: 'Sistema e papel', status: 'Situação' },
  valueLabel: (field, value) => {
    if (field === 'department') return departmentName(value) ?? 'Departamento';
    if (field === 'access') return accessLabel(value);
    return EMPLOYEE_STATUS[value as EmployeeStatus]?.label ?? value;
  },
});

export const EMPLOYEE_SHORTCUTS: { label: string; preset: EmployeeFields }[] = [
  { label: 'Ativos', preset: { status: ['ACTIVE'] } },
  {
    label: 'Com acesso ao Backoffice',
    preset: { access: ['BACKOFFICE:ADMIN', 'BACKOFFICE:MANAGER', 'BACKOFFICE:ANALYST'] },
  },
  { label: 'Desligados', preset: { status: ['TERMINATED'] } },
];
