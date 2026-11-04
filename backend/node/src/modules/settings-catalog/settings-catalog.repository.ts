import type { CatalogKind } from '../../generated/prisma/client.js';
import type { Tx } from '../../shared/database/with-actor.js';

export const ITEM_SELECT = {
  id: true,
  kind: true,
  name: true,
  groupLabel: true,
  description: true,
  negotiatedMonthlyCents: true,
  icon: true,
  selfService: true,
  usedByScale: true,
  active: true,
  sort: true,
  version: true,
  updatedAt: true,
} as const;

export type ItemRow = {
  id: string;
  kind: CatalogKind;
  name: string;
  groupLabel: string | null;
  description: string | null;
  negotiatedMonthlyCents: number | null;
  icon: string | null;
  selfService: boolean;
  usedByScale: boolean;
  active: boolean;
  sort: number;
  version: number;
  updatedAt: Date;
};

export const settingsCatalogRepository = {
  // Itens não excluídos da lista, na ordem dela.
  items(tx: Tx, kind: CatalogKind): Promise<ItemRow[]> {
    return tx.catalogItem.findMany({
      where: { kind, deletedAt: null },
      select: ITEM_SELECT,
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });
  },

  find(tx: Tx, kind: CatalogKind, id: string): Promise<ItemRow | null> {
    return tx.catalogItem.findFirst({
      where: { id, kind, deletedAt: null },
      select: ITEM_SELECT,
    });
  },

  async counts(tx: Tx) {
    return tx.catalogItem.groupBy({
      by: ['kind', 'active'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
  },

  // Quem usa cada item: lojas (não excluídas) com resposta preenchida ou sistema utilizado, nas
  // listas da loja; funcionários (não excluídos), nas listas de pessoas (spec 005).
  // Mobiliário com quantidade 0 e ferramenta marcada como "não usa" não contam.
  async inUse(tx: Tx, ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await tx.$queryRaw<{ itemId: string; users: number }[]>`
      SELECT used.item_id AS "itemId", count(DISTINCT used.user_id)::int AS users
      FROM (
        SELECT e.catalog_item_id AS item_id, e.store_id AS user_id
        FROM store_catalog_entries e
        JOIN stores s ON s.id = e.store_id AND s.deleted_at IS NULL
        WHERE (e.quantity IS NULL OR e.quantity > 0) AND e.uses IS DISTINCT FROM false
        UNION
        SELECT s.demand_system_id, s.id
        FROM stores s
        WHERE s.demand_system_id IS NOT NULL AND s.deleted_at IS NULL
        UNION
        SELECT f.department_id, f.id FROM farmarcas_employees f WHERE f.deleted_at IS NULL
        UNION
        SELECT f.occupation_id, f.id FROM farmarcas_employees f WHERE f.deleted_at IS NULL
      ) used
      WHERE used.item_id = ANY(${ids}::uuid[])
      GROUP BY used.item_id`;
    return new Map(rows.map((row) => [row.itemId, row.users]));
  },

  async nextSort(tx: Tx, kind: CatalogKind): Promise<number> {
    const { _max } = await tx.catalogItem.aggregate({ where: { kind }, _max: { sort: true } });
    return (_max.sort ?? -1) + 1;
  },

  // Gravação condicionada à versão lida: devolve false se outra pessoa gravou antes.
  async updateVersioned(
    tx: Tx,
    id: string,
    version: number,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const { count } = await tx.catalogItem.updateMany({
      where: { id, version, deletedAt: null },
      data: { ...data, version: { increment: 1 } },
    });
    return count === 1;
  },

  // Ids de todos os itens da lista, inclusive os excluídos (para o histórico).
  async allIds(tx: Tx, kind: CatalogKind): Promise<string[]> {
    const rows = await tx.catalogItem.findMany({ where: { kind }, select: { id: true } });
    return rows.map((row) => row.id);
  },
};
