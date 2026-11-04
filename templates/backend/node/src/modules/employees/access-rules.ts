import type { SuiteRole, SuiteSystem } from '../../generated/prisma/client.js';
import { ROLE_LABEL, systemLabel } from './suite-systems.js';

// Regras do acesso aos sistemas (spec 005, FR-022 a FR-026), sem banco.

const roleText = (role: SuiteRole | null) => (role ? ROLE_LABEL[role] : 'sem acesso');

// O Backoffice precisa ter sempre um administrador ativo (FR-024).
export const wouldLeaveNoAdmin = (
  activeAdminIds: string[],
  employeeId: string,
  nextBackofficeRole: SuiteRole | null,
): boolean =>
  activeAdminIds.includes(employeeId) &&
  nextBackofficeRole !== 'ADMIN' &&
  activeAdminIds.length <= 1;

export const accessAction = (before: SuiteRole | null, after: SuiteRole | null) =>
  before === null ? 'ACCESS_GRANTED' : after === null ? 'ACCESS_REVOKED' : 'ACCESS_CHANGED';

// "Backoffice: Analista → Gestor".
export const accessSummary = (
  system: SuiteSystem,
  before: SuiteRole | null,
  after: SuiteRole | null,
): string => `${systemLabel(system)}: ${roleText(before)} → ${roleText(after)}`;

export const terminationSummary = (accesses: { system: SuiteSystem; role: SuiteRole }[]) =>
  `Acessos encerrados no desligamento: ${accesses
    .map((access) => `${systemLabel(access.system)} (${ROLE_LABEL[access.role]})`)
    .join(', ')}`;

// Ninguém muda o próprio acesso (FR-023). Só vale quando o login trouxer o e-mail de quem usa;
// os papéis de demonstração não são pessoas do cadastro.
export const isSelf = (actorEmail: string | undefined, employeeEmail: string) =>
  Boolean(actorEmail) && actorEmail!.toLowerCase() === employeeEmail.toLowerCase();
