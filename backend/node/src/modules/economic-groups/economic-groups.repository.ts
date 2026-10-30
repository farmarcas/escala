import { Prisma } from '../../generated/prisma/client.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { listAuditByGroup, recordAudit } from '../audit/audit.repository.js';
import type { GroupStatusValue } from './economic-groups.schemas.js';
import type {
  EconomicGroupsRepository,
  GroupDetailRecord,
  GroupFilter,
  GroupSize,
  GroupSummaryRecord,
} from './economic-groups.service.js';

const GROUP_SIZES: GroupSize[] = ['none', 'one', 'small', 'medium', 'large'];

type GroupRow = {
  id: string;
  number: number;
  name: string;
  legal_name: string;
  status: GroupStatusValue;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_pseudonym: string | null;
  store_count: number;
  pdv_count: number;
  cd_count: number;
  brands: string[];
  ufs: string[];
  outdated_count: number;
};

const toSummary = (row: GroupRow): GroupSummaryRecord => ({
  id: row.id,
  number: row.number,
  name: row.name,
  legalName: row.legal_name,
  status: row.status,
  owner:
    row.owner_pseudonym && row.owner_name && row.owner_email && row.owner_phone
      ? {
          name: row.owner_name,
          email: row.owner_email,
          phone: row.owner_phone,
          pseudonym: row.owner_pseudonym,
        }
      : null,
  storeCount: row.store_count,
  pdvCount: row.pdv_count,
  cdCount: row.cd_count,
  brands: row.brands,
  ufs: row.ufs,
  outdatedStores: row.outdated_count,
});

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const filterSql = (filter: Partial<GroupFilter>): Prisma.Sql => {
  const parts: Prisma.Sql[] = [Prisma.sql`g.deleted_at IS NULL`];
  if (filter.status) parts.push(Prisma.sql`g.status = ${filter.status}::group_status`);
  if (filter.uf) {
    parts.push(Prisma.sql`EXISTS (SELECT 1 FROM stores x WHERE x.economic_group_id = g.id
                                  AND x.deleted_at IS NULL AND x.uf = ${filter.uf})`);
  }
  if (filter.brandId) {
    parts.push(Prisma.sql`EXISTS (SELECT 1 FROM stores x WHERE x.economic_group_id = g.id
                                  AND x.deleted_at IS NULL AND x.brand_id = ${filter.brandId}::uuid)`);
  }
  if (filter.search) {
    const like = `%${escapeLike(filter.search)}%`;
    const digits = filter.search.replace(/\D/g, '');
    const terms: Prisma.Sql[] = [
      Prisma.sql`g.name ILIKE ${like}`,
      Prisma.sql`g.legal_name ILIKE ${like}`,
      Prisma.sql`o.pseudonym ILIKE ${like}`,
    ];
    if (digits && digits.length <= 9 && /^\s*(ge\s*)?\d+\s*$/i.test(filter.search)) {
      terms.push(Prisma.sql`g.number = ${Number(digits)}`);
    }
    if (filter.searchOwnerName) terms.push(Prisma.sql`o.name ILIKE ${like}`);
    parts.push(Prisma.sql`(${Prisma.join(terms, ' OR ')})`);
  }
  return Prisma.join(parts, ' AND ');
};

// Loja em operação cuja última revisão (ou o cadastro, se nunca revisada) passou de 180 dias.
const OUTDATED_STORE = Prisma.sql`s.status <> 'INACTIVE'
  AND coalesce(s.validated_at, s.created_at) < now() - interval '180 days'`;

const ownerJoin = Prisma.sql`LEFT JOIN group_owners o
  ON o.economic_group_id = g.id AND o.deleted_at IS NULL`;

const selectGroups = (where: Prisma.Sql, tail: Prisma.Sql = Prisma.empty) => Prisma.sql`
  SELECT g.id, g.number, g.name, g.legal_name, g.status,
         o.name AS owner_name, o.email AS owner_email, o.phone AS owner_phone,
         o.pseudonym AS owner_pseudonym,
         count(s.id)::int AS store_count,
         (count(s.id) FILTER (WHERE s.type = 'PDV'))::int AS pdv_count,
         (count(s.id) FILTER (WHERE s.type = 'CD'))::int AS cd_count,
         coalesce(array_agg(DISTINCT b.name) FILTER (WHERE b.name IS NOT NULL), '{}') AS brands,
         coalesce(array_agg(DISTINCT s.uf::text) FILTER (WHERE s.uf IS NOT NULL), '{}') AS ufs,
         (count(s.id) FILTER (WHERE ${OUTDATED_STORE}))::int AS outdated_count
    FROM economic_groups g
    ${ownerJoin}
    LEFT JOIN stores s ON s.economic_group_id = g.id AND s.deleted_at IS NULL
    LEFT JOIN brands b ON b.id = s.brand_id
   WHERE ${where}
   GROUP BY g.id, o.id
   ${tail}`;

const findDetail = async (tx: Tx, where: Prisma.Sql): Promise<GroupDetailRecord | null> => {
  const rows = await tx.$queryRaw<GroupRow[]>(selectGroups(where));
  const row = rows[0];
  if (!row) return null;

  const group = await tx.economicGroup.findUniqueOrThrow({
    where: { id: row.id },
    select: { cnpj: true, createdAt: true, updatedAt: true },
  });
  const byStatus = await tx.store.groupBy({
    by: ['status'],
    where: { economicGroupId: row.id, deletedAt: null },
    _count: { _all: true },
  });
  const brandsBreakdown = await tx.$queryRaw<{ name: string; count: number }[]>`
    SELECT b.name, count(*)::int AS count
      FROM stores s JOIN brands b ON b.id = s.brand_id
     WHERE s.economic_group_id = ${row.id}::uuid AND s.deleted_at IS NULL
     GROUP BY b.name ORDER BY count DESC, b.name`;
  const ufsBreakdown = await tx.$queryRaw<{ uf: string; count: number }[]>`
    SELECT s.uf::text AS uf, count(*)::int AS count
      FROM stores s
     WHERE s.economic_group_id = ${row.id}::uuid AND s.deleted_at IS NULL
     GROUP BY s.uf ORDER BY count DESC, s.uf`;

  const countOf = (status: string) =>
    byStatus.find((item) => item.status === status)?._count._all ?? 0;

  return {
    ...toSummary(row),
    cnpj: group.cnpj,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    activeStores: countOf('ACTIVE'),
    inactiveStores: countOf('INACTIVE'),
    pendingStores: countOf('PENDING'),
    brandsBreakdown,
    ufsBreakdown,
  };
};

const requireDetail = async (tx: Tx, id: string): Promise<GroupDetailRecord> => {
  const found = await findDetail(tx, Prisma.sql`g.id = ${id}::uuid`);
  if (!found) throw new Error(`group ${id} vanished inside transaction`);
  return found;
};

export const economicGroupsRepository: EconomicGroupsRepository = {
  list(actor, filter, page, pageSize) {
    return withActor(actor, async (tx) => {
      const where = filterSql(filter);
      const rows = await tx.$queryRaw<GroupRow[]>(
        selectGroups(
          where,
          Prisma.sql`ORDER BY g.number LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        ),
      );
      const totals = await tx.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total FROM economic_groups g ${ownerJoin} WHERE ${where}`;
      return { data: rows.map(toSummary), total: totals[0]?.total ?? 0 };
    });
  },

  stats(actor) {
    return withActor(actor, async (tx) => {
      const groups = await tx.$queryRaw<
        {
          all: number;
          active: number;
          suspended: number;
          archived: number;
          with_owner: number;
          multi_brand: number;
          with_cd: number;
          outdated: number;
        }[]
      >`
        WITH per_group AS (
          SELECT g.id, g.status,
                 EXISTS (SELECT 1 FROM group_owners o
                          WHERE o.economic_group_id = g.id AND o.deleted_at IS NULL) AS has_owner,
                 count(DISTINCT s.brand_id) AS brands,
                 count(s.id) FILTER (WHERE s.type = 'CD') AS cds,
                 count(s.id) FILTER (WHERE ${OUTDATED_STORE}) AS outdated
            FROM economic_groups g
            LEFT JOIN stores s ON s.economic_group_id = g.id AND s.deleted_at IS NULL
           WHERE g.deleted_at IS NULL
           GROUP BY g.id
        )
        SELECT count(*)::int AS all,
               (count(*) FILTER (WHERE status = 'ACTIVE'))::int AS active,
               (count(*) FILTER (WHERE status = 'SUSPENDED'))::int AS suspended,
               (count(*) FILTER (WHERE status = 'ARCHIVED'))::int AS archived,
               (count(*) FILTER (WHERE has_owner))::int AS with_owner,
               (count(*) FILTER (WHERE brands >= 2))::int AS multi_brand,
               (count(*) FILTER (WHERE cds > 0))::int AS with_cd,
               (count(*) FILTER (WHERE outdated > 0))::int AS outdated
          FROM per_group`;
      const stores = await tx.$queryRaw<{ total: number; pdv: number; cd: number; ufs: number }[]>`
        SELECT count(*)::int AS total,
               (count(*) FILTER (WHERE s.type = 'PDV'))::int AS pdv,
               (count(*) FILTER (WHERE s.type = 'CD'))::int AS cd,
               count(DISTINCT s.uf)::int AS ufs
          FROM stores s
         WHERE s.deleted_at IS NULL`;
      const bySize = await tx.$queryRaw<{ size: GroupSize; groups: number; with_owner: number }[]>`
        SELECT size, count(*)::int AS groups, (count(*) FILTER (WHERE has_owner))::int AS with_owner
          FROM (
            SELECT CASE WHEN count(s.id) = 0 THEN 'none'
                        WHEN count(s.id) = 1 THEN 'one'
                        WHEN count(s.id) <= 5 THEN 'small'
                        WHEN count(s.id) <= 20 THEN 'medium'
                        ELSE 'large' END AS size,
                   EXISTS (SELECT 1 FROM group_owners o
                            WHERE o.economic_group_id = g.id AND o.deleted_at IS NULL) AS has_owner
              FROM economic_groups g
              LEFT JOIN stores s ON s.economic_group_id = g.id AND s.deleted_at IS NULL
             WHERE g.deleted_at IS NULL
             GROUP BY g.id
          ) sized
         GROUP BY size`;
      const byUf = await tx.$queryRaw<{ uf: string; stores: number; groups: number }[]>`
        SELECT s.uf::text AS uf, count(*)::int AS stores,
               count(DISTINCT s.economic_group_id)::int AS groups
          FROM stores s
         WHERE s.deleted_at IS NULL
         GROUP BY s.uf
         ORDER BY stores DESC, uf`;
      const g = groups[0];
      const s = stores[0];
      return {
        byStatus: {
          all: g?.all ?? 0,
          active: g?.active ?? 0,
          suspended: g?.suspended ?? 0,
          archived: g?.archived ?? 0,
        },
        stores: { total: s?.total ?? 0, pdv: s?.pdv ?? 0, cd: s?.cd ?? 0 },
        ufCount: s?.ufs ?? 0,
        withOwner: g?.with_owner ?? 0,
        multiBrand: g?.multi_brand ?? 0,
        groupsWithCd: g?.with_cd ?? 0,
        outdated: g?.outdated ?? 0,
        bySize: GROUP_SIZES.map((size) => {
          const row = bySize.find((item) => item.size === size);
          return { size, groups: row?.groups ?? 0, withOwner: row?.with_owner ?? 0 };
        }),
        byUf,
      };
    });
  },

  findByNumber(actor, number) {
    return withActor(actor, (tx) =>
      findDetail(tx, Prisma.sql`g.number = ${number} AND g.deleted_at IS NULL`),
    );
  },

  create(actor, input, audit) {
    return withActor(actor, async (tx) => {
      const { owner, ...group } = input;
      const created = await tx.economicGroup.create({ data: group, select: { id: true } });
      if (owner) await tx.groupOwner.create({ data: { ...owner, economicGroupId: created.id } });
      await recordAudit(tx, actor, { ...audit, economicGroupId: created.id });
      return requireDetail(tx, created.id);
    });
  },

  update(actor, groupId, input, audit) {
    return withActor(actor, async (tx) => {
      const { owner, ...fields } = input;
      if (Object.keys(fields).length > 0) {
        await tx.economicGroup.update({ where: { id: groupId }, data: fields });
      }
      if (owner) {
        const { pseudonym, ...contact } = owner;
        const current = await tx.groupOwner.findFirst({
          where: { economicGroupId: groupId, deletedAt: null },
          select: { id: true },
        });
        if (current) {
          await tx.groupOwner.update({ where: { id: current.id }, data: contact });
        } else if (pseudonym) {
          await tx.groupOwner.create({ data: { ...contact, pseudonym, economicGroupId: groupId } });
        }
      }
      await recordAudit(tx, actor, { ...audit, economicGroupId: groupId });
      return requireDetail(tx, groupId);
    });
  },

  changeStatus(actor, groupId, status, audit) {
    return withActor(actor, async (tx) => {
      await tx.economicGroup.update({ where: { id: groupId }, data: { status } });
      await recordAudit(tx, actor, { ...audit, economicGroupId: groupId });
      return requireDetail(tx, groupId);
    });
  },

  recordAuditOnce(actor, groupId, audit, withinMinutes) {
    return withActor(actor, async (tx) => {
      const recent = await tx.auditEvent.findFirst({
        where: {
          economicGroupId: groupId,
          action: audit.action,
          actorSubject: actor.subject,
          createdAt: { gte: new Date(Date.now() - withinMinutes * 60_000) },
        },
        select: { id: true },
      });
      if (!recent) await recordAudit(tx, actor, { ...audit, economicGroupId: groupId });
    });
  },

  listAudit(actor, groupId, page, pageSize) {
    return withActor(actor, (tx) => listAuditByGroup(tx, groupId, page, pageSize));
  },
};
