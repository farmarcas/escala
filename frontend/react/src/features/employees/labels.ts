import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { EmployeeGender, EmployeeStatus, SuiteRole, SuiteSystem } from './types';

export const EMPLOYEE_STATUS: Record<EmployeeStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  TERMINATED: { label: 'Desligado', tone: 'neutral' },
};

export const GENDER_LABEL: Record<EmployeeGender, string> = {
  FEMALE: 'Feminino',
  MALE: 'Masculino',
  OTHER: 'Outro',
  UNDISCLOSED: 'Prefiro não informar',
};

export const SYSTEM_LABEL: Record<SuiteSystem, string> = {
  BACKOFFICE: 'Backoffice',
  GESTAO_360: 'Gestão 360',
  ESCALA: 'Escala',
};

export const ROLE_LABEL: Record<SuiteRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  ANALYST: 'Analista',
};

export const ROLE_TONE: Record<SuiteRole, BadgeTone> = {
  ADMIN: 'brand',
  MANAGER: 'info',
  ANALYST: 'neutral',
};

const optionsOf = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export const GENDER_OPTIONS = optionsOf(GENDER_LABEL);

// "Backoffice · Gestor" (filtro e etiquetas da lista).
export const accessLabel = (value: string) => {
  if (value === 'NONE') return 'Sem acesso';
  const [system, role] = value.split(':') as [SuiteSystem, SuiteRole];
  return `${SYSTEM_LABEL[system] ?? system} · ${ROLE_LABEL[role] ?? role}`;
};
