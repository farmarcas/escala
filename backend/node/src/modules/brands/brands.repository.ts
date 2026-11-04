import { Prisma } from '../../generated/prisma/client.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { recordAudit } from '../audit/audit.repository.js';
import type { BrandStatusValue } from './brands.schemas.js';
import type { BrandRecord, BrandsRepository } from './brands.service.js';

type BrandRow = {
  id: string;
  name: string;
  status: BrandStatusValue;
  created_at: Date;
  store_count: number;
  group_count: number;
};

const toRecord = (row: BrandRow): BrandRecord => ({
  id: row.id,
  name: row.name,
  status: row.status,
  storeCount: row.store_count,
  groupCount: row.group_count,
  createdAt: row.created_at,
});

// Contagens vêm das lojas ativas; o RLS já limita o que o ator enxerga.
const selectBrands = (where: Prisma.Sql, tail: Prisma.Sql = Prisma.empty) => Prisma.sql`
  SELECT b.id, b.name, b.status, b.created_at,
         count(s.id)::int AS store_count,
         count(DISTINCT s.economic_group_id)::int AS group_count
    FROM brands b
    LEFT JOIN stores s ON s.brand_id = b.id AND s.deleted_at IS NULL
   WHERE b.deleted_at IS NULL ${where}
   GROUP BY b.id
   ${tail}`;

const findOne = async (tx: Tx, id: string): Promise<BrandRecord | null> => {
  const rows = await tx.$queryRaw<BrandRow[]>(selectBrands(Prisma.sql`AND b.id = ${id}::uuid`));
  return rows[0] ? toRecord(rows[0]) : null;
};

const requireOne = async (tx: Tx, id: string): Promise<BrandRecord> => {
  const found = await findOne(tx, id);
  if (!found) throw new Error(`brand ${id} vanished inside transaction`);
  return found;
};

export const brandsRepository: BrandsRepository = {
  list(actor, filter, page, pageSize) {
    return withActor(actor, async (tx) => {
      const where = filter.status
        ? Prisma.sql`AND b.status = ${filter.status}::brand_status`
        : Prisma.empty;
      const rows = await tx.$queryRaw<BrandRow[]>(
        selectBrands(
          where,
          Prisma.sql`ORDER BY b.status, store_count DESC, b.name
                     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        ),
      );
      const total = await tx.brand.count({
        where: { deletedAt: null, ...(filter.status ? { status: filter.status } : {}) },
      });
      return { data: rows.map(toRecord), total };
    });
  },

  stats(actor) {
    return withActor(actor, async (tx) => {
      const rows = await tx.$queryRaw<
        { active: number; historical: number; without_stores: number }[]
      >`
        SELECT count(*) FILTER (WHERE b.status = 'ACTIVE')::int AS active,
               count(*) FILTER (WHERE b.status = 'HISTORICAL')::int AS historical,
               count(*) FILTER (WHERE b.status = 'ACTIVE' AND NOT EXISTS (
                 SELECT 1 FROM stores s WHERE s.brand_id = b.id AND s.deleted_at IS NULL
               ))::int AS without_stores
          FROM brands b
         WHERE b.deleted_at IS NULL`;
      const row = rows[0];
      return {
        active: row?.active ?? 0,
        historical: row?.historical ?? 0,
        withoutStores: row?.without_stores ?? 0,
      };
    });
  },

  findById(actor, id) {
    return withActor(actor, (tx) => findOne(tx, id));
  },

  findIdByNormalizedName(actor, normalized) {
    return withActor(actor, async (tx) => {
      const found = await tx.brand.findFirst({
        where: { normalizedName: normalized, deletedAt: null },
        select: { id: true },
      });
      return found?.id ?? null;
    });
  },

  create(actor, input, audit) {
    return withActor(actor, async (tx) => {
      const created = await tx.brand.create({ data: input, select: { id: true } });
      await recordAudit(tx, actor, audit);
      return requireOne(tx, created.id);
    });
  },

  update(actor, id, input, audit) {
    return withActor(actor, async (tx) => {
      await tx.brand.update({ where: { id }, data: input });
      await recordAudit(tx, actor, audit);
      return requireOne(tx, id);
    });
  },

  // Exclusão lógica (database/DATABASE.md).
  softDelete(actor, id, audit) {
    return withActor(actor, async (tx) => {
      await tx.brand.update({ where: { id }, data: { deletedAt: new Date() } });
      await recordAudit(tx, actor, audit);
    });
  },
};
