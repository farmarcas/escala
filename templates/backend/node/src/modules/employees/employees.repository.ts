import type { Prisma } from '../../generated/prisma/client.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { listAuditByEntity, recordAudit } from '../audit/audit.repository.js';
import type { EmployeeFilter } from './employees.schemas.js';
import type {
  EmployeeDetailRecord,
  EmployeeRecord,
  EmployeesRepository,
} from './employees.service.js';

// Carteira: grupos fora do arquivo que a pessoa acompanha como Anjo.
const IN_PORTFOLIO = {
  deletedAt: null,
  status: { not: 'ARCHIVED' },
} as const satisfies Prisma.EconomicGroupWhereInput;

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  area: true,
  jobTitle: true,
  accessRole: true,
  status: true,
  terminatedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { angelOf: { where: IN_PORTFOLIO } } },
} as const satisfies Prisma.FarmarcasEmployeeSelect;

type EmployeeRow = Prisma.FarmarcasEmployeeGetPayload<{ select: typeof employeeSelect }>;

const toRecord = ({ _count, ...row }: EmployeeRow): EmployeeRecord => ({
  ...row,
  portfolioCount: _count.angelOf,
});

const whereOf = (filter: EmployeeFilter): Prisma.FarmarcasEmployeeWhereInput => {
  const where: Prisma.FarmarcasEmployeeWhereInput = { deletedAt: null };
  if (filter.area?.length) where.area = { in: filter.area };
  if (filter.accessRole?.length) where.accessRole = { in: filter.accessRole };
  if (filter.status?.length) where.status = { in: filter.status };
  if (filter.search) {
    const text = { contains: filter.search, mode: 'insensitive' } as const;
    where.OR = [{ name: text }, { email: text }, { jobTitle: text }];
  }
  return where;
};

const findDetail = async (tx: Tx, id: string): Promise<EmployeeDetailRecord | null> => {
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
};

const requireDetail = async (tx: Tx, id: string): Promise<EmployeeDetailRecord> => {
  const found = await findDetail(tx, id);
  if (!found) throw new Error(`employee ${id} vanished inside transaction`);
  return found;
};

export const employeesRepository: EmployeesRepository = {
  list(actor, filter, page, pageSize) {
    return withActor(actor, async (tx) => {
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
    });
  },

  // Quantos funcionários há em cada valor do campo; o próprio campo sai do filtro.
  facetCounts(actor, field, filter) {
    return withActor(actor, async (tx) => {
      const rows = await tx.farmarcasEmployee.groupBy({
        by: [field],
        where: whereOf({ ...filter, [field]: undefined }),
        _count: { _all: true },
      });
      return new Map(rows.map((row) => [String(row[field]), row._count._all]));
    });
  },

  stats(actor) {
    return withActor(actor, async (tx) => {
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
          (SELECT count(*) FROM farmarcas_employees e
            WHERE e.deleted_at IS NULL AND e.status = 'ACTIVE'
              AND e.access_role = 'PLATFORM_ADMIN')::int AS admins`;
      const row = rows[0];
      return {
        active: row?.active ?? 0,
        angels: row?.angels ?? 0,
        angelGroups: row?.angel_groups ?? 0,
        groupsWithoutAngel: row?.groups_without_angel ?? 0,
        admins: row?.admins ?? 0,
      };
    });
  },

  findById(actor, id) {
    return withActor(actor, (tx) => findDetail(tx, id));
  },

  findIdByEmail(actor, email) {
    return withActor(actor, async (tx) => {
      const found = await tx.farmarcasEmployee.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
        select: { id: true },
      });
      return found?.id ?? null;
    });
  },

  create(actor, input, audit) {
    return withActor(actor, async (tx) => {
      const created = await tx.farmarcasEmployee.create({
        data: { ...input, phone: input.phone ?? null },
        select: { id: true },
      });
      await recordAudit(tx, actor, audit(created.id));
      return requireDetail(tx, created.id);
    });
  },

  update(actor, id, input, audit) {
    return withActor(actor, async (tx) => {
      await tx.farmarcasEmployee.update({ where: { id }, data: input });
      await recordAudit(tx, actor, audit);
      return requireDetail(tx, id);
    });
  },

  listAudit(actor, id, page, pageSize) {
    return withActor(actor, (tx) => listAuditByEntity(tx, 'EMPLOYEE', id, page, pageSize));
  },
};
