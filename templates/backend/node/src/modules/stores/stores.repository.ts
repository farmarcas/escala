import { Prisma } from '../../generated/prisma/client.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { recordAudit } from '../audit/audit.repository.js';
import { validationStatus } from '../store-page/completeness.js';
import { refreshCompleteness } from '../store-page/store-page.repository.js';
import type { StoreFilter } from './stores.schemas.js';
import type { StoreRecord, StoresRepository } from './stores.service.js';

// Documento com alerta: vencido ou vencendo nos próximos 30 dias.
const ALERT_DAYS = 30;
function alertLimit() {
  return new Date(Date.now() + ALERT_DAYS * 86_400_000);
}

const storeSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  cnpj: true,
  street: true,
  number: true,
  district: true,
  zip: true,
  city: true,
  uf: true,
  openedAt: true,
  status: true,
  createdAt: true,
  completenessFilled: true,
  completenessTotal: true,
  validatedAt: true,
  brand: { select: { id: true, name: true, status: true } },
  economicGroup: { select: { number: true, name: true } },
  _count: {
    select: {
      changeRequests: { where: { status: 'OPEN' } },
      documents: {
        where: { supersededAt: null, requestId: null, validUntil: { lt: alertLimit() } },
      },
    },
  },
} as const satisfies Prisma.StoreSelect;

type StoreRow = Prisma.StoreGetPayload<{ select: typeof storeSelect }>;

const toRecord = (row: StoreRow): StoreRecord => ({
  id: row.id,
  code: row.code,
  groupNumber: row.economicGroup.number,
  groupName: row.economicGroup.name,
  brand: row.brand,
  name: row.name,
  type: row.type,
  cnpj: row.cnpj,
  street: row.street,
  number: row.number,
  district: row.district,
  zip: row.zip,
  city: row.city,
  uf: row.uf,
  openedAt: row.openedAt ? row.openedAt.toISOString().slice(0, 10) : null,
  status: row.status,
  createdAt: row.createdAt,
  completeness: { filled: row.completenessFilled, total: row.completenessTotal },
  validation: {
    ...validationStatus(row.validatedAt, new Date()),
    validatedAt: row.validatedAt,
  },
  docAlerts: row._count.documents,
  openRequests: row._count.changeRequests,
});

const whereOf = (filter: StoreFilter): Prisma.StoreWhereInput => {
  const where: Prisma.StoreWhereInput = { deletedAt: null };
  if (filter.groupId) where.economicGroupId = filter.groupId;
  if (filter.type) where.type = filter.type;
  if (filter.status) where.status = filter.status;
  if (filter.brandId) where.brandId = filter.brandId;
  if (filter.uf) where.uf = filter.uf;
  if (filter.search) {
    const text = { contains: filter.search, mode: 'insensitive' } as const;
    const digits = filter.search.replace(/\D/g, '');
    const or: Prisma.StoreWhereInput[] = [
      { name: text },
      { city: text },
      { economicGroup: { name: text } },
    ];
    if (digits.length >= 2) or.push({ cnpj: { startsWith: digits } });
    if (/^\s*(ge\s*)?\d{1,9}\s*$/i.test(filter.search)) {
      or.push({ economicGroup: { number: Number(digits) } });
    }
    if (/^\s*lj-?\d{1,9}\s*$/i.test(filter.search)) or.push({ code: Number(digits) });
    where.OR = or;
  }
  return where;
};

const VALIDATION_SQL: Record<string, Prisma.Sql> = {
  never: Prisma.sql`validated_at IS NULL`,
  overdue: Prisma.sql`validated_at + interval '6 months' < now()`,
  due_soon: Prisma.sql`validated_at + interval '6 months' BETWEEN now() AND now() + interval '30 days'`,
  ok: Prisma.sql`validated_at + interval '6 months' > now() + interval '30 days'`,
  // Loja inativa não é cobrada pela validação (spec 002, casos de borda).
  attention: Prisma.sql`status <> 'INACTIVE' AND (validated_at IS NULL OR validated_at + interval '6 months' < now())`,
};

const COMPLETENESS_SQL: Record<string, Prisma.Sql> = {
  complete: Prisma.sql`completeness_total > 0 AND completeness_filled >= completeness_total`,
  partial: Prisma.sql`completeness_filled < completeness_total AND completeness_filled * 100 >= completeness_total * 80`,
  // Loja ainda sem cálculo (total 0) conta como "falta muito".
  low: Prisma.sql`(completeness_total = 0 OR completeness_filled * 100 < completeness_total * 80)`,
};

// Filtros de governança viram uma lista de ids calculada no banco.
const governanceIds = async (tx: Tx, filter: StoreFilter): Promise<string[] | null> => {
  const parts: Prisma.Sql[] = [];
  if (filter.completeness) parts.push(COMPLETENESS_SQL[filter.completeness]!);
  if (filter.validation) parts.push(VALIDATION_SQL[filter.validation]!);
  if (filter.hasOpenRequest) {
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM store_change_requests r WHERE r.store_id = stores.id AND r.status = 'OPEN')`,
    );
  }
  if (parts.length === 0) return null;
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM stores WHERE deleted_at IS NULL AND ${Prisma.join(parts, ' AND ')}`;
  return rows.map((row) => row.id);
};

const requireOne = async (tx: Tx, id: string): Promise<StoreRecord> =>
  toRecord(await tx.store.findUniqueOrThrow({ where: { id }, select: storeSelect }));

export const storesRepository: StoresRepository = {
  list(actor, filter, page, pageSize) {
    return withActor(actor, async (tx) => {
      const where = whereOf(filter);
      const ids = await governanceIds(tx, filter);
      if (ids) where.id = { in: ids };
      const rows = await tx.store.findMany({
        where,
        select: storeSelect,
        orderBy: [{ economicGroup: { number: 'asc' } }, { code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await tx.store.count({ where });
      return { data: rows.map(toRecord), total };
    });
  },

  stats(actor) {
    return withActor(actor, async (tx) => {
      const rows = await tx.$queryRaw<
        {
          total: number;
          pdv: number;
          cd: number;
          active: number;
          pending: number;
          inactive: number;
          groups: number;
          avg_completeness: number | null;
          validation_attention: number;
        }[]
      >`
        SELECT count(*)::int AS total,
               (count(*) FILTER (WHERE type = 'PDV'))::int AS pdv,
               (count(*) FILTER (WHERE type = 'CD'))::int AS cd,
               (count(*) FILTER (WHERE status = 'ACTIVE'))::int AS active,
               (count(*) FILTER (WHERE status = 'PENDING'))::int AS pending,
               (count(*) FILTER (WHERE status = 'INACTIVE'))::int AS inactive,
               count(DISTINCT economic_group_id)::int AS groups,
               round(avg(completeness_filled * 100.0 / NULLIF(completeness_total, 0)))::int AS avg_completeness,
               (count(*) FILTER (WHERE ${VALIDATION_SQL.attention!}))::int AS validation_attention
          FROM stores
         WHERE deleted_at IS NULL`;
      const alerts = await tx.$queryRaw<
        { docs: number; doc_stores: number; requests: number; request_stores: number }[]
      >`
        SELECT (SELECT count(*) FROM store_documents d
                 WHERE d.superseded_at IS NULL AND d.request_id IS NULL
                   AND d.valid_until < now() + interval '30 days')::int AS docs,
               (SELECT count(DISTINCT d.store_id) FROM store_documents d
                 WHERE d.superseded_at IS NULL AND d.request_id IS NULL
                   AND d.valid_until < now() + interval '30 days')::int AS doc_stores,
               (SELECT count(*) FROM store_change_requests r WHERE r.status = 'OPEN')::int AS requests,
               (SELECT count(DISTINCT r.store_id) FROM store_change_requests r
                 WHERE r.status = 'OPEN')::int AS request_stores`;
      const row = rows[0];
      const alert = alerts[0];
      return {
        total: row?.total ?? 0,
        pdv: row?.pdv ?? 0,
        cd: row?.cd ?? 0,
        active: row?.active ?? 0,
        pending: row?.pending ?? 0,
        inactive: row?.inactive ?? 0,
        groups: row?.groups ?? 0,
        avgCompleteness: row?.avg_completeness ?? 0,
        validationAttention: row?.validation_attention ?? 0,
        docAlerts: { docs: alert?.docs ?? 0, stores: alert?.doc_stores ?? 0 },
        openRequests: { requests: alert?.requests ?? 0, stores: alert?.request_stores ?? 0 },
      };
    });
  },

  findById(actor, id) {
    return withActor(actor, async (tx) => {
      const row = await tx.store.findFirst({ where: { id, deletedAt: null }, select: storeSelect });
      return row ? toRecord(row) : null;
    });
  },

  findGroup(actor, number) {
    return withActor(actor, (tx) =>
      tx.economicGroup.findFirst({
        where: { number, deletedAt: null },
        select: { id: true, status: true },
      }),
    );
  },

  findBrand(actor, id) {
    return withActor(actor, (tx) =>
      tx.brand.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } }),
    );
  },

  isCnpjTaken(actor, cnpj) {
    return withActor(actor, async (tx) => {
      const found = await tx.store.findFirst({
        where: { cnpj, deletedAt: null },
        select: { id: true },
      });
      return found !== null;
    });
  },

  create(actor, groupId, input, audit) {
    return withActor(actor, async (tx) => {
      const { openedAt, ...fields } = input;
      const created = await tx.store.create({
        data: {
          ...fields,
          economicGroupId: groupId,
          ...(openedAt ? { openedAt: new Date(`${openedAt}T00:00:00.000Z`) } : {}),
        },
        select: { id: true, code: true },
      });
      await recordAudit(tx, actor, audit(created.code));
      await refreshCompleteness(tx, created.id);
      return requireOne(tx, created.id);
    });
  },

  updateStatus(actor, id, status, audit) {
    return withActor(actor, async (tx) => {
      await tx.store.update({ where: { id }, data: { status } });
      await recordAudit(tx, actor, audit);
      return requireOne(tx, id);
    });
  },
};
