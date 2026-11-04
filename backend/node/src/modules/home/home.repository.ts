import { Prisma } from '../../generated/prisma/client.js';
import { REGIONS, type Region } from '../../shared/br/uf.js';
import type { Tx } from '../../shared/database/with-actor.js';

export type UfPresence = {
  uf: string;
  stores: number;
  groups: number;
  groupsWithOwner: number;
  cities: number;
  topCities: { city: string; stores: number }[];
  brands: { name: string; stores: number }[];
  topGroups: { number: number; name: string; stores: number }[];
};

type Totals = { stores: number; groups: number; groupsWithOwner: number };

export type HomeMap = {
  totals: Totals;
  // Um grupo com lojas em vários estados conta uma vez na região e uma vez no Brasil.
  regions: (Totals & { region: Region })[];
  ufs: UfPresence[];
};

const TOP_CITIES = 4;
const TOP_GROUPS = 3;

// Rede em operação: loja não excluída e não inativa, de grupo não arquivado
// (specs/003-backoffice-fase-2/data-model.md, Fatia 0).
const NETWORK = Prisma.sql`
  network AS (
    SELECT s.uf, s.city, s.brand_id, s.economic_group_id,
           EXISTS (SELECT 1 FROM group_owners o
                    WHERE o.economic_group_id = s.economic_group_id AND o.deleted_at IS NULL) AS has_owner
      FROM stores s
      JOIN economic_groups g ON g.id = s.economic_group_id
     WHERE s.deleted_at IS NULL AND s.status <> 'INACTIVE'
       AND g.deleted_at IS NULL AND g.status <> 'ARCHIVED'
  )`;

const REGION_OF_UF = Prisma.join(
  Object.entries(REGIONS).flatMap(([region, ufs]) =>
    ufs.map((uf) => Prisma.sql`(${uf}, ${region})`),
  ),
);

type TotalsRow = { stores: number; groups: number; groups_with_owner: number };

const toTotals = (row: TotalsRow): Totals => ({
  stores: row.stores,
  groups: row.groups,
  groupsWithOwner: row.groups_with_owner,
});

export const homeRepository = {
  // Consultas em sequência: dentro de uma transação interativa há uma só conexão.
  async map(tx: Tx): Promise<HomeMap> {
    const totals = await tx.$queryRaw<TotalsRow[]>`
      WITH ${NETWORK}
      SELECT count(*)::int AS stores,
             count(DISTINCT economic_group_id)::int AS groups,
             (count(DISTINCT economic_group_id) FILTER (WHERE has_owner))::int AS groups_with_owner
        FROM network`;

    const regions = await tx.$queryRaw<(TotalsRow & { region: Region })[]>`
      WITH ${NETWORK}
      SELECT r.region,
             count(*)::int AS stores,
             count(DISTINCT n.economic_group_id)::int AS groups,
             (count(DISTINCT n.economic_group_id) FILTER (WHERE n.has_owner))::int AS groups_with_owner
        FROM network n
        JOIN (VALUES ${REGION_OF_UF}) AS r(uf, region) ON r.uf = n.uf
       GROUP BY r.region`;

    const byUf = await tx.$queryRaw<
      { uf: string; stores: number; groups: number; groups_with_owner: number; cities: number }[]
    >`
      WITH ${NETWORK}
      SELECT uf,
             count(*)::int AS stores,
             count(DISTINCT economic_group_id)::int AS groups,
             (count(DISTINCT economic_group_id) FILTER (WHERE has_owner))::int AS groups_with_owner,
             count(DISTINCT lower(city))::int AS cities
        FROM network
       GROUP BY uf
       ORDER BY stores DESC, uf`;

    const cities = await tx.$queryRaw<{ uf: string; city: string; stores: number }[]>`
      WITH ${NETWORK},
      ranked AS (
        SELECT uf, mode() WITHIN GROUP (ORDER BY city) AS city, count(*)::int AS stores,
               row_number() OVER (PARTITION BY uf ORDER BY count(*) DESC, lower(city)) AS position
          FROM network
         GROUP BY uf, lower(city)
      )
      SELECT uf, city, stores FROM ranked WHERE position <= ${TOP_CITIES} ORDER BY uf, position`;

    const brands = await tx.$queryRaw<{ uf: string; name: string; stores: number }[]>`
      WITH ${NETWORK}
      SELECT n.uf, b.name, count(*)::int AS stores
        FROM network n
        JOIN brands b ON b.id = n.brand_id
       GROUP BY n.uf, b.name
       ORDER BY n.uf, stores DESC, b.name`;

    const groups = await tx.$queryRaw<
      { uf: string; number: number; name: string; stores: number }[]
    >`
      WITH ${NETWORK},
      ranked AS (
        SELECT n.uf, g.number, g.name, count(*)::int AS stores,
               row_number() OVER (PARTITION BY n.uf ORDER BY count(*) DESC, g.number) AS position
          FROM network n
          JOIN economic_groups g ON g.id = n.economic_group_id
         GROUP BY n.uf, g.number, g.name
      )
      SELECT uf, number, name, stores FROM ranked WHERE position <= ${TOP_GROUPS} ORDER BY uf, position`;

    const pick = <T extends { uf: string }>(rows: T[], uf: string) =>
      rows.filter((row) => row.uf === uf).map(({ uf: _uf, ...rest }) => rest);

    return {
      totals: toTotals(totals[0] ?? { stores: 0, groups: 0, groups_with_owner: 0 }),
      regions: regions.map((row) => ({ region: row.region, ...toTotals(row) })),
      ufs: byUf.map((row) => ({
        uf: row.uf,
        stores: row.stores,
        groups: row.groups,
        groupsWithOwner: row.groups_with_owner,
        cities: row.cities,
        topCities: pick(cities, row.uf),
        brands: pick(brands, row.uf),
        topGroups: pick(groups, row.uf),
      })),
    };
  },
};
