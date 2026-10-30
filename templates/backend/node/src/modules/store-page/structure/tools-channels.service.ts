import type { Tx } from '../../../shared/database/with-actor.js';
import { ForbiddenError } from '../../../shared/errors/forbidden-error.js';
import { NotFoundError } from '../../../shared/errors/not-found-error.js';
import type { StorePermissions } from '../permissions.js';
import {
  addHistory,
  entriesOfKind,
  type HistoryEntry,
  type StoreRow,
} from '../store-page.repository.js';
import { channelText, toolText } from './tools.js';

type Actor = Pick<HistoryEntry, 'actorKind' | 'actorSubject' | 'actorRole'>;

// Ferramentas externas e canais: o grupo preenche; a Farmarcas acompanha (US8 e US9).
const requireTenantWrite = (permissions: StorePermissions, allowed: boolean) => {
  if (!allowed) {
    throw new ForbiddenError(
      permissions.canEditBasic ? 'Preenchido pelo grupo; a Farmarcas acompanha' : 'Somente leitura',
    );
  }
};

const history = (
  store: StoreRow,
  actor: Actor,
  label: string,
  oldValue: string | null,
  newValue: string | null,
): HistoryEntry => ({
  storeId: store.id,
  economicGroupId: store.economicGroupId,
  kind: 'EDIT',
  fieldLabel: label,
  oldValue,
  newValue,
  ...actor,
});

const catalogItem = async (tx: Tx, id: string, kind: 'EXTERNAL_TOOL' | 'CHANNEL') => {
  const item = await tx.catalogItem.findFirst({ where: { id, kind, active: true } });
  if (!item) throw new NotFoundError('Item de catálogo não encontrado', 'CATALOG_ITEM_NOT_FOUND');
  return item;
};

export const toolsChannelsService = {
  async setTool(
    tx: Tx,
    store: StoreRow,
    permissions: StorePermissions,
    actor: Actor,
    itemId: string,
    uses: boolean,
    monthlyCostCents: number | null,
  ) {
    requireTenantWrite(permissions, permissions.canEditTools);
    const item = await catalogItem(tx, itemId, 'EXTERNAL_TOOL');
    const current = entriesOfKind(store, 'EXTERNAL_TOOL').find(
      (entry) => entry.catalogItemId === itemId,
    );
    const cost = uses ? (monthlyCostCents ?? 0) : null;
    const before = toolText(current ? current.uses : null, current?.monthlyCostCents ?? null);
    const after = toolText(uses, cost);
    if (before === after) return false;
    await tx.storeCatalogEntry.upsert({
      where: { storeId_catalogItemId: { storeId: store.id, catalogItemId: itemId } },
      create: { storeId: store.id, catalogItemId: itemId, uses, monthlyCostCents: cost },
      update: { uses, monthlyCostCents: cost },
    });
    if (uses && store.noExternalTools) {
      await tx.store.update({ where: { id: store.id }, data: { noExternalTools: false } });
    }
    await addHistory(tx, [history(store, actor, `Ferramentas · ${item.name}`, before, after)]);
    return true;
  },

  async setChannel(
    tx: Tx,
    store: StoreRow,
    permissions: StorePermissions,
    actor: Actor,
    itemId: string,
    uses: boolean,
    identifier: string | null,
  ) {
    requireTenantWrite(permissions, permissions.canEditChannels);
    const item = await catalogItem(tx, itemId, 'CHANNEL');
    const current = entriesOfKind(store, 'CHANNEL').find((entry) => entry.catalogItemId === itemId);
    const value = uses ? identifier?.trim() || null : null;
    const before = channelText(current ? current.uses : null, current?.identifier ?? null);
    const after = channelText(uses, value);
    if (before === after) return false;
    await tx.storeCatalogEntry.upsert({
      where: { storeId_catalogItemId: { storeId: store.id, catalogItemId: itemId } },
      create: { storeId: store.id, catalogItemId: itemId, uses, identifier: value },
      update: { uses, identifier: value },
    });
    await addHistory(tx, [history(store, actor, `Canais · ${item.name}`, before, after)]);
    return true;
  },

  async setNoExternalTools(
    tx: Tx,
    store: StoreRow,
    permissions: StorePermissions,
    actor: Actor,
    value: boolean,
  ) {
    requireTenantWrite(permissions, permissions.canEditTools);
    if (store.noExternalTools === value) return false;
    await tx.store.update({ where: { id: store.id }, data: { noExternalTools: value } });
    await addHistory(tx, [
      history(
        store,
        actor,
        'Ferramentas · Declaração',
        value ? null : 'Não usa ferramentas externas',
        value ? 'Não usa ferramentas externas' : null,
      ),
    ]);
    return true;
  },

  async addCustom(
    tx: Tx,
    store: StoreRow,
    permissions: StorePermissions,
    actor: Actor,
    input: {
      kind: 'EXTERNAL_TOOL' | 'CHANNEL';
      name: string;
      category?: string;
      identifier?: string;
      monthlyCostCents?: number;
    },
  ) {
    requireTenantWrite(
      permissions,
      input.kind === 'CHANNEL' ? permissions.canEditChannels : permissions.canEditTools,
    );
    await tx.storeCustomEntry.create({
      data: {
        storeId: store.id,
        kind: input.kind,
        name: input.name,
        category: input.category || null,
        identifier: input.identifier || null,
        monthlyCostCents: input.kind === 'EXTERNAL_TOOL' ? (input.monthlyCostCents ?? 0) : null,
      },
    });
    const area = input.kind === 'CHANNEL' ? 'Canais' : 'Ferramentas';
    const detail =
      input.kind === 'CHANNEL'
        ? channelText(true, input.identifier ?? null)
        : toolText(true, input.monthlyCostCents ?? 0);
    await addHistory(tx, [
      history(store, actor, `${area} · ${input.name}`, null, `Incluído pelo grupo · ${detail}`),
    ]);
    return true;
  },

  async updateCustom(
    tx: Tx,
    store: StoreRow,
    permissions: StorePermissions,
    actor: Actor,
    entryId: string,
    patch: { identifier?: string | null; monthlyCostCents?: number | null },
  ) {
    const entry = await tx.storeCustomEntry.findFirst({
      where: { id: entryId, storeId: store.id, deletedAt: null },
    });
    if (!entry) throw new NotFoundError('Item não encontrado', 'CUSTOM_ENTRY_NOT_FOUND');
    requireTenantWrite(
      permissions,
      entry.kind === 'CHANNEL' ? permissions.canEditChannels : permissions.canEditTools,
    );
    const isChannel = entry.kind === 'CHANNEL';
    const next = {
      identifier: patch.identifier !== undefined ? patch.identifier : entry.identifier,
      monthlyCostCents:
        patch.monthlyCostCents !== undefined ? patch.monthlyCostCents : entry.monthlyCostCents,
    };
    const before = isChannel
      ? channelText(true, entry.identifier)
      : toolText(true, entry.monthlyCostCents);
    const after = isChannel
      ? channelText(true, next.identifier)
      : toolText(true, next.monthlyCostCents);
    if (before === after) return false;
    await tx.storeCustomEntry.update({ where: { id: entry.id }, data: next });
    await addHistory(tx, [
      history(
        store,
        actor,
        `${isChannel ? 'Canais' : 'Ferramentas'} · ${entry.name}`,
        before,
        after,
      ),
    ]);
    return true;
  },

  async removeCustom(
    tx: Tx,
    store: StoreRow,
    permissions: StorePermissions,
    actor: Actor,
    entryId: string,
  ) {
    const entry = await tx.storeCustomEntry.findFirst({
      where: { id: entryId, storeId: store.id, deletedAt: null },
    });
    if (!entry) throw new NotFoundError('Item não encontrado', 'CUSTOM_ENTRY_NOT_FOUND');
    requireTenantWrite(
      permissions,
      entry.kind === 'CHANNEL' ? permissions.canEditChannels : permissions.canEditTools,
    );
    await tx.storeCustomEntry.update({ where: { id: entry.id }, data: { deletedAt: new Date() } });
    const before =
      entry.kind === 'CHANNEL'
        ? channelText(true, entry.identifier)
        : toolText(true, entry.monthlyCostCents);
    await addHistory(tx, [
      history(
        store,
        actor,
        `${entry.kind === 'CHANNEL' ? 'Canais' : 'Ferramentas'} · ${entry.name}`,
        before,
        'Removido',
      ),
    ]);
    return true;
  },
};
