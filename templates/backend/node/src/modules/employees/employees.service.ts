import { Prisma, type SuiteRole, type SuiteSystem } from '../../generated/prisma/client.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import { assertExportSize, EXPORT_LIMIT } from '../../shared/http/csv.js';
import type { FacetCount } from '../../shared/http/list-filters.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import { listAuditByEntity, recordAudit } from '../audit/audit.repository.js';
import { inactiveItem } from '../store-page/structure/inactive-rule.js';
import {
  accessAction,
  accessSummary,
  terminationSummary,
  wouldLeaveNoAdmin,
} from './access-rules.js';
import { changesSummary, type EmployeeSnapshot } from './changes-summary.js';
import { statusTransition } from './employee-status.js';
import {
  ACCESS_VALUES,
  employeeStatusSchema,
  type CreateEmployeeInput,
  type EmployeeFacetField,
  type EmployeeFilter,
  type EmployeeStatusChangeInput,
  type UpdateEmployeeInput,
} from './employees.schemas.js';
import { employeesRepository as repo, type EmployeeDetailRecord } from './employees.repository.js';
import { SUITE_ROLES, SUITE_SYSTEMS } from './suite-systems.js';

export type { EmployeeDetailRecord, EmployeeRecord } from './employees.repository.js';

const notFound = () => new NotFoundError('Funcionário não encontrado', 'EMPLOYEE_NOT_FOUND');
const emailTaken = () =>
  new ConflictError('Já existe um funcionário com esse e-mail', 'EMPLOYEE_EMAIL_TAKEN');
const versionConflict = () =>
  new ConflictError(
    'Este perfil mudou desde que você abriu. Recarregue para ver a versão atual.',
    'VERSION_CONFLICT',
  );
const lastAdmin = () =>
  new ConflictError(
    'O Backoffice precisa ter pelo menos um administrador. Dê o papel a outra pessoa antes.',
    'LAST_ADMIN',
  );

const employeeAudit = (id: string, action: string, summary: string, justification?: string) => ({
  economicGroupId: null,
  entity: { type: 'EMPLOYEE' as const, id },
  action,
  summary,
  justification: justification ?? null,
});

const actorOf = (identity: PlatformIdentity) => ({
  subject: identity.subject,
  role: identity.role,
});

const requireDetail = async (tx: Tx, id: string): Promise<EmployeeDetailRecord> => {
  const employee = await repo.findDetail(tx, id);
  if (!employee) throw notFound();
  return employee;
};

// Departamento e ocupação: item da lista certa; desativado só se já é o valor da pessoa.
const ensureItem = async (
  tx: Tx,
  id: string,
  kind: 'DEPARTMENT' | 'OCCUPATION',
  currentId?: string,
) => {
  const item = await repo.listItem(tx, id);
  const field = kind === 'DEPARTMENT' ? 'departmentId' : 'occupationId';
  if (!item || item.kind !== kind) {
    throw new AppError('Escolha um item da lista', 400, 'VALIDATION_ERROR', [
      { path: field, message: 'Escolha um item da lista' },
    ]);
  }
  if (!item.active && item.id !== currentId) throw inactiveItem();
  return item;
};

const snapshot = (employee: EmployeeDetailRecord): EmployeeSnapshot => ({
  name: employee.name,
  email: employee.email,
  gender: employee.gender,
  mobile: employee.mobile,
  landline: employee.landline,
  department: employee.department.name,
  occupation: employee.occupation.name,
});

const ensureEmailFree = async (tx: Tx, email: string, exceptId?: string) => {
  const owner = await repo.findIdByEmail(tx, email);
  if (owner && owner !== exceptId) throw emailTaken();
};

// Funcionários da Farmarcas: perfil e acesso aos sistemas da Suite (specs 003 e 005).
export const employeesService = {
  list(actor: PlatformIdentity, filter: EmployeeFilter, page: number, pageSize: number) {
    return withActor(actor, async (tx) => {
      const { data, total } = await repo.list(tx, filter, page, pageSize);
      return { data, meta: { page, pageSize, total } };
    });
  },

  stats(actor: PlatformIdentity) {
    return withActor(actor, (tx) => repo.stats(tx));
  },

  // Quantos funcionários há em cada valor do campo, com os outros filtros aplicados.
  facets(actor: PlatformIdentity, field: EmployeeFacetField, filter: EmployeeFilter) {
    const others: EmployeeFilter = { ...filter, [field]: undefined };
    return withActor(actor, async (tx) => {
      let data: FacetCount[];
      if (field === 'department') {
        const counts = await repo.departmentCounts(tx, others);
        const departments = await tx.catalogItem.findMany({
          where: { kind: 'DEPARTMENT', deletedAt: null },
          select: { id: true },
          orderBy: [{ sort: 'asc' }, { name: 'asc' }],
        });
        data = departments.map(({ id }) => ({ value: id, count: counts.get(id) ?? 0 }));
      } else if (field === 'status') {
        const counts = await repo.statusCounts(tx, others);
        data = employeeStatusSchema.options.map((value) => ({
          value,
          count: counts.get(value) ?? 0,
        }));
      } else {
        data = [];
        for (const value of ACCESS_VALUES) {
          data.push({ value, count: await repo.count(tx, { ...others, access: [value] }) });
        }
      }
      return { field, data };
    });
  },

  exportRows(actor: PlatformIdentity, filter: EmployeeFilter) {
    return withActor(actor, async (tx) => {
      const { data, total } = await repo.list(tx, filter, 1, EXPORT_LIMIT);
      assertExportSize(total);
      return data;
    });
  },

  // Listas e regras para o perfil e o cadastro (os três papéis da plataforma leem).
  options(actor: PlatformIdentity) {
    return withActor(actor, async (tx) => ({
      departments: await repo.activeItems(tx, 'DEPARTMENT'),
      occupations: await repo.activeItems(tx, 'OCCUPATION'),
      systems: SUITE_SYSTEMS,
      roles: SUITE_ROLES,
    }));
  },

  get(actor: PlatformIdentity, id: string) {
    return withActor(actor, (tx) => requireDetail(tx, id));
  },

  create(actor: PlatformIdentity, input: CreateEmployeeInput) {
    return withActor(actor, async (tx) => {
      await ensureEmailFree(tx, input.email);
      await ensureItem(tx, input.departmentId, 'DEPARTMENT');
      await ensureItem(tx, input.occupationId, 'OCCUPATION');
      const created = await tx.farmarcasEmployee.create({
        data: { ...input, gender: input.gender ?? null, landline: input.landline ?? null },
        select: { id: true },
      });
      await recordAudit(
        tx,
        actorOf(actor),
        employeeAudit(created.id, 'EMPLOYEE_CREATED', `Funcionário ${input.name} cadastrado`),
      );
      return requireDetail(tx, created.id);
    });
  },

  update(actor: PlatformIdentity, id: string, input: UpdateEmployeeInput) {
    const { version, ...fields } = input;
    return withActor(actor, async (tx) => {
      const current = await requireDetail(tx, id);
      if (current.version !== version) throw versionConflict();
      if (fields.email && fields.email !== current.email)
        await ensureEmailFree(tx, fields.email, id);
      const department = fields.departmentId
        ? await ensureItem(tx, fields.departmentId, 'DEPARTMENT', current.department.id)
        : current.department;
      const occupation = fields.occupationId
        ? await ensureItem(tx, fields.occupationId, 'OCCUPATION', current.occupation.id)
        : current.occupation;
      const before = snapshot(current);
      const after: EmployeeSnapshot = {
        name: fields.name ?? before.name,
        email: fields.email ?? before.email,
        gender: fields.gender === undefined ? before.gender : fields.gender,
        mobile: fields.mobile ?? before.mobile,
        landline: fields.landline === undefined ? before.landline : fields.landline,
        department: department.name,
        occupation: occupation.name,
      };
      const summary = changesSummary(before, after);
      if (!summary) return current;
      const { count } = await tx.farmarcasEmployee.updateMany({
        where: { id, version },
        data: { ...fields, version: { increment: 1 } },
      });
      if (count === 0) throw versionConflict();
      await recordAudit(tx, actorOf(actor), employeeAudit(id, 'EMPLOYEE_UPDATED', summary));
      return requireDetail(tx, id);
    });
  },

  // Desligar encerra os acessos (e não deixa o Backoffice sem administrador); religar volta sem
  // acesso (spec 005, FR-025).
  changeStatus(actor: PlatformIdentity, id: string, input: EmployeeStatusChangeInput) {
    return withActor(actor, async (tx) => {
      const current = await requireDetail(tx, id);
      const transition = statusTransition(current.status, input.action, current.portfolioCount);
      const now = new Date();
      if (transition.to === 'TERMINATED') {
        if (wouldLeaveNoAdmin(await repo.activeBackofficeAdmins(tx), id, null)) throw lastAdmin();
      }
      await tx.farmarcasEmployee.update({
        where: { id },
        data: {
          status: transition.to,
          terminatedAt: transition.to === 'TERMINATED' ? now : null,
          version: { increment: 1 },
        },
      });
      await recordAudit(
        tx,
        actorOf(actor),
        employeeAudit(
          id,
          transition.action,
          `Funcionário ${current.name} ${transition.verb}`,
          input.justification,
        ),
      );
      if (transition.to === 'TERMINATED' && current.accesses.length > 0) {
        await tx.employeeSystemAccess.updateMany({
          where: { employeeId: id, revokedAt: null },
          data: { revokedAt: now, revokedBy: actor.subject },
        });
        await recordAudit(
          tx,
          actorOf(actor),
          employeeAudit(id, 'ACCESS_REVOKED_BY_TERMINATION', terminationSummary(current.accesses)),
        );
      }
      return requireDetail(tx, id);
    });
  },

  // Concede, troca ou tira o acesso a um sistema (spec 005, US2). Trocar encerra o vigente.
  setAccess(actor: PlatformIdentity, id: string, system: SuiteSystem, role: SuiteRole | null) {
    return withActor(actor, async (tx) => {
      const employee = await requireDetail(tx, id);
      if (employee.status !== 'ACTIVE' && role !== null) {
        throw new ConflictError(
          'Funcionário desligado não recebe acesso. Religue antes.',
          'EMPLOYEE_TERMINATED',
        );
      }
      const current = await repo.currentAccess(tx, id, system);
      const before = current?.role ?? null;
      if (before === role) return employee;
      if (
        system === 'BACKOFFICE' &&
        wouldLeaveNoAdmin(await repo.activeBackofficeAdmins(tx), id, role)
      )
        throw lastAdmin();
      const now = new Date();
      if (current) {
        await tx.employeeSystemAccess.update({
          where: { id: current.id },
          data: { revokedAt: now, revokedBy: actor.subject },
        });
      }
      if (role) {
        await tx.employeeSystemAccess
          .create({
            data: { employeeId: id, system, role, grantedAt: now, grantedBy: actor.subject },
          })
          .catch((error: unknown) => {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
              throw new ConflictError(
                'Outra pessoa mudou este acesso agora. Recarregue.',
                'VERSION_CONFLICT',
              );
            throw error;
          });
      }
      await recordAudit(
        tx,
        actorOf(actor),
        employeeAudit(id, accessAction(before, role), accessSummary(system, before, role)),
      );
      return requireDetail(tx, id);
    });
  },

  listAudit(actor: PlatformIdentity, id: string, page: number, pageSize: number) {
    return withActor(actor, async (tx) => {
      await requireDetail(tx, id);
      const { data, total } = await listAuditByEntity(tx, 'EMPLOYEE', id, page, pageSize);
      return { data, meta: { page, pageSize, total } };
    });
  },
};
