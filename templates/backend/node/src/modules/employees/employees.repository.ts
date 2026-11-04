import type { Prisma, SuiteRole, SuiteSystem } from '../../generated/prisma/client.js';
import type { Tx } from '../../shared/database/with-actor.js';
import { NO_ACCESS, type EmployeeFilter } from './employees.schemas.js';

// Carteira: grupos fora do arquivo que a pessoa acompanha como Anjo.
const IN_PORTFOLIO = {
  deletedAt: null,
  status: { not: 'ARCHIVED' },
} as const satisfies Prisma.EconomicGroupWhereInput;

const ITEM = { select: { id: true, name: true, active: true } } as const;

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  gender: true,
  mobile: true,
  landline: true,
  department: ITEM,
  occupation: ITEM,
  status: true,
  terminatedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  accesses: {
    select: { system: true, role: true, grantedAt: true, grantedBy: true, revokedAt: true },
    orderBy: { grantedAt: 'asc' },
  },
  _count: { select: { angelOf: { where: IN_PORTFOLIO } } },
} as const satisfies Prisma.FarmarcasEmployeeSelect;

type EmployeeRow = Prisma.FarmarcasEmployeeGetPayload<{ select: typeof employeeSelect }>;

export type AccessView = {
  system: SuiteSystem;
  role: SuiteRole;
  grantedAt: Date;
  grantedBy: string;
  revokedAt: Date | null;
};

export type EmployeeRecord = Omit<EmployeeRow, '_count' | 'accesses'> & {
  accesses: AccessView[];
  portfolioCount: number;
};

export type PortfolioGroup = { number: number; name: string; status: string; storeCount: number };
export type EmployeeDetailRecord = EmployeeRecord & { portfolio: PortfolioGroup[] };

// Ativo mostra os acessos vigentes; desligado, os que foram encerrados no desligamento.
const toRecord = ({ _count, accesses, ...row }: EmployeeRow): EmployeeRecord => ({
  ...row,
  accesses:
    row.status === 'TERMINATED'
      ? accesses.filter(
          (access) =>
            access.revokedAt !== null &&
            row.terminatedAt !== null &&
            access.revokedAt.getTime() === row.terminatedAt.getTime(),
        )
      : accesses.filter((access) => access.revokedAt === null),
  portfolioCount: _count.angelOf,
});

const accessWhere = (values: string[]): Prisma.FarmarcasEmployeeWhereInput[] =>
  values.map((value) => {
    if (value === NO_ACCESS) return { accesses: { none: { revokedAt: null } } };
    const [system, role] = value.split(':') as [SuiteSystem, SuiteRole];
    return { accesses: { some: { system, role, revokedAt: null } } };
  });

export const whereOf = (filter: EmployeeFilter): Prisma.FarmarcasEmployeeWhereInput => {
  const and: Prisma.FarmarcasEmployeeWhereInput[] = [{ deletedAt: null }];
  if (filter.department?.length) and.push({ departmentId: { in: filter.department } });
  if (filter.status?.length) and.push({ status: { in: filter.status } });
  if (filter.access?.length) and.push({ OR: accessWhere(filter.access) });
  if (filter.search) {
    const text = { contains: filter.search, mode: 'insensitive' } as const;
    and.push({ OR: [{ name: text }, { email: text }, { occupation: { name: text } }] });
  }
  return { AND: and };
};

export const employeesRepository = {
  async list(tx: Tx, filter: EmployeeFilter, page: number, pageSize: number) {
    const where = whereOf(filter);
    const rows = await tx.farmarcasEmployee.findMany({
      where,
      select: employeeSelect,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const total = await tx.farmarcasEmployee.count({ where });
    return { data: rows.map(toRecord), total };
  },

  count(tx: Tx, filter: EmployeeFilter) {
    return tx.farmarcasEmployee.count({ where: whereOf(filter) });
  },

  async departmentCounts(tx: Tx, filter: EmployeeFilter) {
    const rows = await tx.farmarcasEmployee.groupBy({
      by: ['departmentId'],
      where: whereOf(filter),
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.departmentId, row._count._all]));
  },

  async statusCounts(tx: Tx, filter: EmployeeFilter) {
    const rows = await tx.farmarcasEmployee.groupBy({
      by: ['status'],
      where: whereOf(filter),
      _count: { _all: true },
    });
    return new Map<string, number>(rows.map((row) => [row.status, row._count._all]));
  },

  async stats(tx: Tx) {
    const rows = await tx.$queryRaw<
      {
        active: number;
        angels: number;
        angel_groups: number;
        groups_without_angel: number;
        admins: number;
      }[]
    >`
      SELECT
        (SELECT count(*) FROM farmarcas_employees e
          WHERE e.deleted_at IS NULL AND e.status = 'ACTIVE')::int AS active,
        (SELECT count(DISTINCT g.angel_employee_id) FROM economic_groups g
          WHERE g.deleted_at IS NULL AND g.status <> 'ARCHIVED'
            AND g.angel_employee_id IS NOT NULL)::int AS angels,
        (SELECT count(*) FROM economic_groups g
          WHERE g.deleted_at IS NULL AND g.status <> 'ARCHIVED'
            AND g.angel_employee_id IS NOT NULL)::int AS angel_groups,
        (SELECT count(*) FROM economic_groups g
          WHERE g.deleted_at IS NULL AND g.status <> 'ARCHIVED'
            AND g.angel_employee_id IS NULL)::int AS groups_without_angel,
        (SELECT count(DISTINCT a.employee_id) FROM employee_system_accesses a
           JOIN farmarcas_employees e ON e.id = a.employee_id
          WHERE e.deleted_at IS NULL AND e.status = 'ACTIVE' AND a.revoked_at IS NULL
            AND a.system = 'BACKOFFICE' AND a.role = 'ADMIN')::int AS admins`;
    const row = rows[0];
    return {
      active: row?.active ?? 0,
      angels: row?.angels ?? 0,
      angelGroups: row?.angel_groups ?? 0,
      groupsWithoutAngel: row?.groups_without_angel ?? 0,
      admins: row?.admins ?? 0,
    };
  },

  async findDetail(tx: Tx, id: string): Promise<EmployeeDetailRecord | null> {
    const row = await tx.farmarcasEmployee.findFirst({
      where: { id, deletedAt: null },
      select: employeeSelect,
    });
    if (!row) return null;
    const groups = await tx.economicGroup.findMany({
      where: { angelEmployeeId: id, deletedAt: null },
      select: {
        number: true,
        name: true,
        status: true,
        _count: { select: { stores: { where: { deletedAt: null } } } },
      },
      orderBy: [{ status: 'asc' }, { number: 'asc' }],
    });
    return {
      ...toRecord(row),
      portfolio: groups.map(({ _count, ...group }) => ({ ...group, storeCount: _count.stores })),
    };
  },

  async findIdByEmail(tx: Tx, email: string) {
    const found = await tx.farmarcasEmployee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });
    return found?.id ?? null;
  },

  // Itens de Configurações (departamento, ocupação) não excluídos.
  listItem(tx: Tx, id: string) {
    return tx.catalogItem.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, kind: true, name: true, active: true },
    });
  },

  activeItems(tx: Tx, kind: 'DEPARTMENT' | 'OCCUPATION') {
    return tx.catalogItem.findMany({
      where: { kind, deletedAt: null, active: true },
      select: { id: true, name: true },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });
  },

  // Ids dos administradores ativos do Backoffice (para a regra do último administrador).
  async activeBackofficeAdmins(tx: Tx): Promise<string[]> {
    const rows = await tx.employeeSystemAccess.findMany({
      where: {
        system: 'BACKOFFICE',
        role: 'ADMIN',
        revokedAt: null,
        employee: { status: 'ACTIVE', deletedAt: null },
      },
      select: { employeeId: true },
    });
    return [...new Set(rows.map((row) => row.employeeId))];
  },

  currentAccess(tx: Tx, employeeId: string, system: SuiteSystem) {
    return tx.employeeSystemAccess.findFirst({
      where: { employeeId, system, revokedAt: null },
      select: { id: true, role: true },
    });
  },
};
