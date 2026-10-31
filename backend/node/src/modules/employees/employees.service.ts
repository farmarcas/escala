import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import { assertExportSize, EXPORT_LIMIT } from '../../shared/http/csv.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import type { AuditEntry, AuditEventView } from '../audit/audit.types.js';
import { statusTransition } from './employee-status.js';
import type {
  CreateEmployeeInput,
  EmployeeAccessRoleValue,
  EmployeeAreaValue,
  EmployeeFilter,
  EmployeeStatusChangeInput,
  EmployeeStatusValue,
  UpdateEmployeeInput,
} from './employees.schemas.js';

export type EmployeeRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  area: EmployeeAreaValue;
  jobTitle: string;
  accessRole: EmployeeAccessRoleValue;
  status: EmployeeStatusValue;
  terminatedAt: Date | null;
  // Grupos fora do arquivo que esta pessoa acompanha como Anjo.
  portfolioCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PortfolioGroup = { number: number; name: string; status: string; storeCount: number };

export type EmployeeDetailRecord = EmployeeRecord & { portfolio: PortfolioGroup[] };

export type EmployeeStats = {
  active: number;
  angels: number;
  angelGroups: number;
  groupsWithoutAngel: number;
  admins: number;
};

export type EmployeeWrite = Partial<Omit<CreateEmployeeInput, 'phone'>> & {
  phone?: string | null;
  status?: EmployeeStatusValue;
  terminatedAt?: Date | null;
};

export type EmployeesRepository = {
  list: (
    actor: PlatformIdentity,
    filter: EmployeeFilter,
    page: number,
    pageSize: number,
  ) => Promise<{ data: EmployeeRecord[]; total: number }>;
  stats: (actor: PlatformIdentity) => Promise<EmployeeStats>;
  findById: (actor: PlatformIdentity, id: string) => Promise<EmployeeDetailRecord | null>;
  findIdByEmail: (actor: PlatformIdentity, email: string) => Promise<string | null>;
  create: (
    actor: PlatformIdentity,
    input: CreateEmployeeInput,
    audit: (id: string) => AuditEntry,
  ) => Promise<EmployeeDetailRecord>;
  update: (
    actor: PlatformIdentity,
    id: string,
    input: EmployeeWrite,
    audit: AuditEntry,
  ) => Promise<EmployeeDetailRecord>;
  listAudit: (
    actor: PlatformIdentity,
    id: string,
    page: number,
    pageSize: number,
  ) => Promise<{ data: AuditEventView[]; total: number }>;
};

const notFound = () => new NotFoundError('Funcionário não encontrado', 'EMPLOYEE_NOT_FOUND');
const emailTaken = () =>
  new ConflictError('Já existe um funcionário com esse e-mail', 'EMPLOYEE_EMAIL_TAKEN');

const FIELD_LABELS: Record<keyof UpdateEmployeeInput, string> = {
  name: 'nome',
  email: 'e-mail',
  phone: 'telefone',
  area: 'área',
  jobTitle: 'cargo',
  accessRole: 'papel de acesso',
};

const employeeAudit = (id: string, action: string, summary: string, justification?: string) => ({
  economicGroupId: null,
  entity: { type: 'EMPLOYEE' as const, id },
  action,
  summary,
  justification: justification ?? null,
});

export const makeEmployeesService = (repo: EmployeesRepository) => {
  const requireEmployee = async (actor: PlatformIdentity, id: string) => {
    const employee = await repo.findById(actor, id);
    if (!employee) throw notFound();
    return employee;
  };

  return {
    async list(actor: PlatformIdentity, filter: EmployeeFilter, page: number, pageSize: number) {
      const { data, total } = await repo.list(actor, filter, page, pageSize);
      return { data, meta: { page, pageSize, total } };
    },

    stats(actor: PlatformIdentity) {
      return repo.stats(actor);
    },

    async exportRows(actor: PlatformIdentity, filter: EmployeeFilter) {
      const { data, total } = await repo.list(actor, filter, 1, EXPORT_LIMIT);
      assertExportSize(total);
      return data;
    },

    get: requireEmployee,

    async create(actor: PlatformIdentity, input: CreateEmployeeInput) {
      if (await repo.findIdByEmail(actor, input.email)) throw emailTaken();
      return repo.create(actor, input, (id) =>
        employeeAudit(id, 'EMPLOYEE_CREATED', `Funcionário ${input.name} cadastrado`),
      );
    },

    async update(actor: PlatformIdentity, id: string, input: UpdateEmployeeInput) {
      const current = await requireEmployee(actor, id);
      if (input.email && input.email !== current.email) {
        const owner = await repo.findIdByEmail(actor, input.email);
        if (owner && owner !== id) throw emailTaken();
      }
      const changed = (Object.keys(input) as (keyof UpdateEmployeeInput)[]).filter(
        (key) => input[key] !== undefined && input[key] !== current[key],
      );
      if (changed.length === 0) return current;

      return repo.update(
        actor,
        id,
        Object.fromEntries(changed.map((key) => [key, input[key]])),
        employeeAudit(
          id,
          'EMPLOYEE_UPDATED',
          `Dados alterados: ${changed.map((key) => FIELD_LABELS[key]).join(', ')}`,
        ),
      );
    },

    async changeStatus(actor: PlatformIdentity, id: string, input: EmployeeStatusChangeInput) {
      const current = await requireEmployee(actor, id);
      const transition = statusTransition(current.status, input.action, current.portfolioCount);
      return repo.update(
        actor,
        id,
        {
          status: transition.to,
          terminatedAt: transition.to === 'TERMINATED' ? new Date() : null,
        },
        employeeAudit(
          id,
          transition.action,
          `Funcionário ${current.name} ${transition.verb}`,
          input.justification,
        ),
      );
    },

    async listAudit(actor: PlatformIdentity, id: string, page: number, pageSize: number) {
      await requireEmployee(actor, id);
      const { data, total } = await repo.listAudit(actor, id, page, pageSize);
      return { data, meta: { page, pageSize, total } };
    },
  };
};

export type EmployeesService = ReturnType<typeof makeEmployeesService>;
