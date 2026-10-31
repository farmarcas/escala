import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { EmployeeAccessRole, EmployeeArea, EmployeeStatus } from './types';

// Áreas da Farmarcas: a mesma lista do Gestão 360.
export const AREA_LABEL: Record<EmployeeArea, string> = {
  COMMERCIAL: 'Comercial',
  MEMBER_FINANCE: 'Financeiro do associado',
  TRADE: 'Trade',
  DIGITAL_PRODUCTS: 'Produtos digitais',
  MEMBER_SUCCESS: 'Sucesso do associado',
  OPERATIONS: 'Operações',
};

export const ACCESS_ROLE_LABEL: Record<EmployeeAccessRole, string> = {
  PLATFORM_ADMIN: 'Administrador da plataforma',
  PLATFORM_ANALYST: 'Analista da plataforma',
  NONE: 'Sem acesso ao Backoffice',
};

export const EMPLOYEE_STATUS: Record<EmployeeStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  TERMINATED: { label: 'Desligado', tone: 'neutral' },
};

const optionsOf = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export const AREA_OPTIONS = optionsOf(AREA_LABEL);
export const ACCESS_ROLE_OPTIONS = optionsOf(ACCESS_ROLE_LABEL);
