import { withActor, type Tx } from '../../../shared/database/with-actor.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ForbiddenError } from '../../../shared/errors/forbidden-error.js';
import { NotFoundError } from '../../../shared/errors/not-found-error.js';
import type { Identity } from '../../../shared/identity/identity.js';
import {
  addHistory,
  entriesOfKind,
  refreshCompleteness,
  type HistoryEntry,
  type StoreRow,
} from '../store-page.repository.js';
import type { StorePermissions } from '../permissions.js';
import { WEEKDAYS, summarizeHours, type OpeningHour } from './hours.js';
import { canAnswerInactive, inactiveItem, newlyAddedInactive } from './inactive-rule.js';
import type { StructureEdit } from './structure.schemas.js';

type Actor = Pick<HistoryEntry, 'actorKind' | 'actorSubject' | 'actorRole'>;

// Horário dos 8 dias; dia sem registro aparece fechado.
export const hoursOf = (store: StoreRow): OpeningHour[] =>
  WEEKDAYS.map((day) => {
    const hour = store.openingHours.find((item) => item.day === day);
    return hour
      ? {
          day,
          isOpen: hour.isOpen,
          opensAt: hour.opensAt,
          closesAt: hour.closesAt,
          is24h: hour.is24h,
          isOnCall: hour.isOnCall,
        }
      : { day, isOpen: false, opensAt: null, closesAt: null, is24h: false, isOnCall: false };
  });

const STRUCTURE_LABELS = {
  ownBuilding: 'Prédio próprio',
  areaM2: 'Área da loja (m²)',
  salesAreaM2: 'Área de venda (m²)',
  staffCount: 'Número de colaboradores',
  demandSystemId: 'Sistema de demanda',
} as const;

const SELECTION_KINDS = {
  services: { kind: 'SERVICE', label: 'Serviços oferecidos' },
  practiceTools: { kind: 'PRACTICE_TOOL', label: 'Ferramentas de boas práticas' },
  pbms: { kind: 'PBM', label: 'PBMs aceitos' },
} as const;

const show = (value: unknown, names: Map<string, string>): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return names.get(String(value)) ?? String(value);
};

const listText = (ids: string[], names: Map<string, string>) =>
  ids.length === 0
    ? null
    : ids
        .map((id) => names.get(id) ?? id)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .join(', ');

// Itens da lista certa e não excluídos; desativado só se a loja já tinha (inactive-rule).
const ensureKind = async (tx: Tx, ids: string[], kind: string, current: string[] = []) => {
  if (ids.length === 0) return;
  const found = await tx.catalogItem.findMany({
    where: { id: { in: ids }, kind: kind as 'SERVICE', deletedAt: null },
    select: { id: true, active: true },
  });
  if (found.length !== new Set(ids).size) {
    throw new AppError('Item de catálogo inválido para este campo', 400, 'CATALOG_ITEM_INVALID');
  }
  const activeIds = new Set(found.filter((item) => item.active).map((item) => item.id));
  if (newlyAddedInactive(current, ids, activeIds).length > 0) throw inactiveItem();
};

const catalogNames = async (tx: Tx) =>
  new Map(
    (await tx.catalogItem.findMany({ select: { id: true, name: true } })).map((item) => [
      item.id,
      item.name,
    ]),
  );

/**
 * Aplica estrutura, horário, catálogos marcados e seções livres (parte do PATCH da loja).
 * Devolve as linhas de histórico e os dados de coluna da loja que mudaram.
 */
export const applyStructureEdit = async (
  tx: Tx,
  store: StoreRow,
  edit: StructureEdit,
  permissions: StorePermissions,
  actor: Actor,
  reason: string | null,
) => {
  const names = await catalogNames(tx);
  const history: HistoryEntry[] = [];
  const storeData: Record<string, unknown> = {};
  const base = {
    storeId: store.id,
    economicGroupId: store.economicGroupId,
    kind: 'EDIT' as const,
    justification: reason,
    ...actor,
  };

  if (edit.structure) {
    if (edit.structure.demandSystemId)
      await ensureKind(
        tx,
        [edit.structure.demandSystemId],
        'DEMAND_SYSTEM',
        store.demandSystemId ? [store.demandSystemId] : [],
      );
    for (const [key, label] of Object.entries(STRUCTURE_LABELS)) {
      const next = edit.structure[key as keyof typeof STRUCTURE_LABELS];
      if (next === undefined) continue;
      const current = store[key as keyof typeof STRUCTURE_LABELS];
      if (next === current) continue;
      storeData[key] = next;
      history.push({
        ...base,
        fieldKey: key,
        fieldLabel: label,
        oldValue: show(current, names),
        newValue: show(next, names),
      });
    }
  }

  if (edit.hours) {
    const before = summarizeHours(hoursOf(store));
    const after = summarizeHours(edit.hours);
    if (before !== after) {
      for (const hour of edit.hours) {
        await tx.storeOpeningHour.upsert({
          where: { storeId_day: { storeId: store.id, day: hour.day } },
          create: { storeId: store.id, ...hour },
          update: hour,
        });
      }
      history.push({
        ...base,
        fieldKey: 'hours',
        fieldLabel: 'Horário de funcionamento',
        oldValue: before,
        newValue: after,
      });
    }
  }

  if (edit.selections) {
    for (const [key, { kind, label }] of Object.entries(SELECTION_KINDS)) {
      const next = edit.selections[key as keyof typeof SELECTION_KINDS];
      if (!next) continue;
      const current = entriesOfKind(store, kind).map((entry) => entry.catalogItemId);
      await ensureKind(tx, next, kind, current);
      const toAdd = next.filter((id) => !current.includes(id));
      const toRemove = current.filter((id) => !next.includes(id));
      if (toAdd.length === 0 && toRemove.length === 0) continue;
      if (toRemove.length > 0) {
        await tx.storeCatalogEntry.deleteMany({
          where: { storeId: store.id, catalogItemId: { in: toRemove } },
        });
      }
      if (toAdd.length > 0) {
        await tx.storeCatalogEntry.createMany({
          data: toAdd.map((catalogItemId) => ({ storeId: store.id, catalogItemId })),
        });
      }
      history.push({
        ...base,
        fieldKey: key,
        fieldLabel: label,
        oldValue: listText(current, names),
        newValue: listText([...new Set(next)], names),
      });
    }
  }

  if (edit.freeSections) {
    if (!permissions.canEditFreeSections)
      throw new ForbiddenError('Seções livres são mantidas pela Farmarcas');
    const before = store.freeSections.map((section) => section.title).join(', ') || null;
    const keepIds = edit.freeSections.flatMap((section) => (section.id ? [section.id] : []));
    for (const existing of store.freeSections) {
      if (!keepIds.includes(existing.id)) {
        await tx.storeFreeSection.update({
          where: { id: existing.id },
          data: { deletedAt: new Date() },
        });
      }
    }
    for (const [index, section] of edit.freeSections.entries()) {
      const exists = section.id && store.freeSections.some((item) => item.id === section.id);
      const id = exists
        ? section.id!
        : (
            await tx.storeFreeSection.create({
              data: {
                storeId: store.id,
                title: section.title,
                createdBy: actor.actorSubject,
                sort: index,
              },
              select: { id: true },
            })
          ).id;
      if (exists)
        await tx.storeFreeSection.update({
          where: { id },
          data: { title: section.title, sort: index },
        });
      await tx.storeFreeField.deleteMany({ where: { sectionId: id } });
      if (section.fields.length > 0) {
        await tx.storeFreeField.createMany({
          data: section.fields.map((field, sort) => ({
            sectionId: id,
            label: field.label,
            value: field.value,
            sort,
          })),
        });
      }
    }
    const after = edit.freeSections.map((section) => section.title).join(', ') || null;
    const changed =
      JSON.stringify(
        store.freeSections.map((s) => [s.id, s.title, s.fields.map((f) => [f.label, f.value])]),
      ) !==
      JSON.stringify(
        edit.freeSections.map((s) => [s.id, s.title, s.fields.map((f) => [f.label, f.value])]),
      );
    if (changed)
      history.push({
        ...base,
        fieldKey: 'freeSections',
        fieldLabel: 'Seções livres de informação',
        oldValue: before,
        newValue: after,
      });
  }

  return { history, storeData };
};

export const furnitureText = (quantity: number, trade: number) =>
  `${quantity} na loja · ${trade} p/ Trade`;

export const structureService = {
  catalog(identity: Identity, kind?: string) {
    return withActor(identity, async (tx) => ({
      // Desativados também vêm: a tela mostra os que a loja já usa (specs/004, FR-031).
      data: await tx.catalogItem.findMany({
        where: { deletedAt: null, ...(kind ? { kind: kind as 'SERVICE' } : {}) },
        select: {
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
        },
        orderBy: [{ kind: 'asc' }, { sort: 'asc' }],
      }),
    }));
  },

  // Estratégias: só o grupo define; mantém o "desde" das que continuam.
  async setStrategies(
    tx: Tx,
    store: StoreRow,
    permissions: StorePermissions,
    actor: Actor,
    itemIds: string[],
  ) {
    if (!permissions.canEditStrategies)
      throw new ForbiddenError('O grupo define as estratégias; a Farmarcas vê');
    const unique = [...new Set(itemIds)];
    const current = entriesOfKind(store, 'STRATEGY').map((entry) => entry.catalogItemId);
    await ensureKind(tx, unique, 'STRATEGY', current);
    const toAdd = unique.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !unique.includes(id));
    if (toAdd.length === 0 && toRemove.length === 0) return false;
    const names = await catalogNames(tx);
    if (toRemove.length > 0) {
      await tx.storeCatalogEntry.deleteMany({
        where: { storeId: store.id, catalogItemId: { in: toRemove } },
      });
    }
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
    if (toAdd.length > 0) {
      await tx.storeCatalogEntry.createMany({
        data: toAdd.map((catalogItemId) => ({ storeId: store.id, catalogItemId, since: today })),
      });
    }
    await addHistory(tx, [
      {
        storeId: store.id,
        economicGroupId: store.economicGroupId,
        kind: 'EDIT',
        fieldKey: 'strategies',
        fieldLabel: 'Estratégias da loja',
        oldValue: listText(current, names),
        newValue: listText(unique, names),
        ...actor,
      },
    ]);
    await refreshCompleteness(tx, store.id);
    return true;
  },

  async setFurniture(
    tx: Tx,
    store: StoreRow,
    permissions: StorePermissions,
    actor: Actor,
    itemId: string,
    quantity: number,
    tradeQuantity: number,
  ) {
    if (!permissions.canEditFurniture) throw new ForbiddenError('Somente leitura');
    if (tradeQuantity > quantity) {
      throw new AppError('Trade não pode passar do total na loja', 400, 'TRADE_EXCEEDS_TOTAL');
    }
    const item = await tx.catalogItem.findFirst({
      where: { id: itemId, kind: 'FURNITURE', deletedAt: null },
    });
    if (!item)
      throw new NotFoundError('Item de mobiliário não encontrado', 'CATALOG_ITEM_NOT_FOUND');
    const current = entriesOfKind(store, 'FURNITURE').find(
      (entry) => entry.catalogItemId === itemId,
    );
    if (!item.active && !canAnswerInactive((current?.quantity ?? 0) > 0, quantity > 0))
      throw inactiveItem();
    const before = current
      ? furnitureText(current.quantity ?? 0, current.tradeQuantity ?? 0)
      : null;
    const after = furnitureText(quantity, tradeQuantity);
    if (before === after) return false;
    await tx.storeCatalogEntry.upsert({
      where: { storeId_catalogItemId: { storeId: store.id, catalogItemId: itemId } },
      create: { storeId: store.id, catalogItemId: itemId, quantity, tradeQuantity },
      update: { quantity, tradeQuantity },
    });
    await addHistory(tx, [
      {
        storeId: store.id,
        economicGroupId: store.economicGroupId,
        kind: 'EDIT',
        fieldKey: `furniture:${itemId}`,
        fieldLabel: `Mobiliário · ${item.name}`,
        oldValue: before,
        newValue: after,
        ...actor,
      },
    ]);
    return true;
  },
};
