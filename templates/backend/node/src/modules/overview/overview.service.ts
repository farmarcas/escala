import { Prisma } from '../../generated/prisma/client.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import { REQUEST_TYPES } from '../store-page/change-requests/types.js';

export type OverviewFilter = { brandId?: string; uf?: string };

// Lojas que entram nos agregados: a marca e a UF são da loja (Product Vision §6.4).
const storeFilterSql = (filter: OverviewFilter, alias = 's'): Prisma.Sql => {
  const parts: Prisma.Sql[] = [Prisma.sql`${Prisma.raw(alias)}.deleted_at IS NULL`];
  if (filter.brandId)
    parts.push(Prisma.sql`${Prisma.raw(alias)}.brand_id = ${filter.brandId}::uuid`);
  if (filter.uf) parts.push(Prisma.sql`${Prisma.raw(alias)}.uf = ${filter.uf}`);
  return Prisma.join(parts, ' AND ');
};

// Com filtro de marca ou UF, só contam os grupos que têm loja nesse recorte.
const groupFilterSql = (filter: OverviewFilter): Prisma.Sql =>
  filter.brandId || filter.uf
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM stores x WHERE x.economic_group_id = g.id AND ${storeFilterSql(filter, 'x')})`
    : Prisma.empty;

const countGroups = async (tx: Tx, filter: OverviewFilter) => {
  const rows = await tx.$queryRaw<
    { all: number; active: number; suspended: number; archived: number; without_owner: number }[]
  >`
    SELECT count(*)::int AS all,
           (count(*) FILTER (WHERE g.status = 'ACTIVE'))::int AS active,
           (count(*) FILTER (WHERE g.status = 'SUSPENDED'))::int AS suspended,
           (count(*) FILTER (WHERE g.status = 'ARCHIVED'))::int AS archived,
           (count(*) FILTER (WHERE g.status <> 'ARCHIVED' AND NOT EXISTS (
              SELECT 1 FROM group_owners o WHERE o.economic_group_id = g.id AND o.deleted_at IS NULL)))::int AS without_owner
      FROM economic_groups g
     WHERE g.deleted_at IS NULL ${groupFilterSql(filter)}`;
  return rows[0] ?? { all: 0, active: 0, suspended: 0, archived: 0, without_owner: 0 };
};

const countStores = async (tx: Tx, filter: OverviewFilter) => {
  const rows = await tx.$queryRaw<
    {
      total: number;
      pdv: number;
      cd: number;
      pending: number;
      validation_attention: number;
      validation_groups: number;
      low_completeness: number;
    }[]
  >`
    SELECT count(*)::int AS total,
           (count(*) FILTER (WHERE s.type = 'PDV'))::int AS pdv,
           (count(*) FILTER (WHERE s.type = 'CD'))::int AS cd,
           (count(*) FILTER (WHERE s.status = 'PENDING'))::int AS pending,
           (count(*) FILTER (WHERE s.status <> 'INACTIVE'
              AND (s.validated_at IS NULL OR s.validated_at + interval '6 months' < now())))::int AS validation_attention,
           (count(DISTINCT s.economic_group_id) FILTER (WHERE s.status <> 'INACTIVE'
              AND (s.validated_at IS NULL OR s.validated_at + interval '6 months' < now())))::int AS validation_groups,
           (count(*) FILTER (WHERE s.completeness_total = 0
              OR s.completeness_filled * 100 < s.completeness_total * 80))::int AS low_completeness
      FROM stores s
     WHERE ${storeFilterSql(filter)}`;
  return (
    rows[0] ?? {
      total: 0,
      pdv: 0,
      cd: 0,
      pending: 0,
      validation_attention: 0,
      validation_groups: 0,
      low_completeness: 0,
    }
  );
};

const countDocumentAlerts = async (tx: Tx, filter: OverviewFilter) => {
  const rows = await tx.$queryRaw<{ docs: number; stores: number }[]>`
    SELECT count(*)::int AS docs, count(DISTINCT d.store_id)::int AS stores
      FROM store_documents d
      JOIN stores s ON s.id = d.store_id
     WHERE d.superseded_at IS NULL AND d.request_id IS NULL
       AND d.valid_until < now() + interval '30 days'
       AND ${storeFilterSql(filter)}`;
  return rows[0] ?? { docs: 0, stores: 0 };
};

// Solicitações paradas numa etapa da Farmarcas (ou do sistema, concluída pela Farmarcas).
const countRequestsWaitingPlatform = async (tx: Tx, filter: OverviewFilter) => {
  const open = await tx.$queryRaw<
    { type: keyof typeof REQUEST_TYPES; current_step: number; store_id: string }[]
  >`
    SELECT r.type, r.current_step, r.store_id
      FROM store_change_requests r
      JOIN stores s ON s.id = r.store_id
     WHERE r.status = 'OPEN' AND ${storeFilterSql(filter)}`;
  const waiting = open.filter((row) => {
    const owner = REQUEST_TYPES[row.type].steps[row.current_step]?.owner;
    return owner === 'platform' || owner === 'system';
  });
  return {
    requests: waiting.length,
    stores: new Set(waiting.map((row) => row.store_id)).size,
    open: open.length,
  };
};

export const overviewService = {
  get(actor: PlatformIdentity, filter: OverviewFilter) {
    return withActor(actor, async (tx) => {
      const groups = await countGroups(tx, filter);
      const stores = await countStores(tx, filter);
      const documents = await countDocumentAlerts(tx, filter);
      const requests = await countRequestsWaitingPlatform(tx, filter);
      return {
        groups: {
          all: groups.all,
          active: groups.active,
          suspended: groups.suspended,
          archived: groups.archived,
          withoutOwner: groups.without_owner,
        },
        stores: { total: stores.total, pdv: stores.pdv, cd: stores.cd },
        // Pontos de atenção do cadastro: a ação é sempre por grupo e por loja, nunca por pessoa.
        attention: {
          groupsWithoutOwner: groups.without_owner,
          storesValidationAttention: {
            stores: stores.validation_attention,
            groups: stores.validation_groups,
          },
          requestsWaitingPlatform: { requests: requests.requests, stores: requests.stores },
          documentAlerts: documents,
          storesPending: stores.pending,
          storesLowCompleteness: stores.low_completeness,
        },
        // Uso, funcionários e módulos licenciados ainda não são registrados pela plataforma.
        unavailable: ['usage', 'employees', 'licensedModules'],
      };
    });
  },
};
