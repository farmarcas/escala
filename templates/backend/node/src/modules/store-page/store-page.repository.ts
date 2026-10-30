import type { Prisma } from '../../generated/prisma/client.js';
import type { Tx } from '../../shared/database/with-actor.js';
import { computeCompleteness } from './completeness.js';
import { BASIC_FIELD_KEYS } from './fields.js';
import { hasOpeningHours } from './structure/hours.js';

// Acesso ao banco da página da loja. Funções recebem a transação aberta por withActor:
// o RLS já limita ao que o ator pode ver (grupo vê só as próprias lojas).

export const storeInclude = {
  brand: { select: { id: true, name: true, status: true } },
  demandSystem: { select: { id: true, name: true } },
  openingHours: true,
  catalogEntries: { include: { catalogItem: { select: { id: true, kind: true, name: true } } } },
  customEntries: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
  freeSections: {
    where: { deletedAt: null },
    orderBy: { sort: 'asc' },
    include: { fields: { orderBy: { sort: 'asc' } } },
  },
  economicGroup: {
    select: {
      id: true,
      number: true,
      name: true,
      status: true,
      owners: {
        where: { deletedAt: null },
        select: { name: true, pseudonym: true, email: true, phone: true },
        take: 1,
      },
    },
  },
} as const satisfies Prisma.StoreInclude;

export type StoreRow = Prisma.StoreGetPayload<{ include: typeof storeInclude }>;

export const findStoreByCode = (tx: Tx, code: number) =>
  tx.store.findFirst({ where: { code, deletedAt: null }, include: storeInclude });

// Documentos vigentes da loja (os de solicitação ficam na solicitação).
export const currentDocuments = (tx: Tx, storeId: string) =>
  tx.storeDocument.findMany({
    where: { storeId, supersededAt: null, requestId: null },
    select: {
      id: true,
      docType: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      validUntil: true,
      uploadedByKind: true,
      uploadedBy: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

// Última edição de cada campo, para o "Alterado em … por …".
export const lastEditsByField = (tx: Tx, storeId: string) =>
  tx.$queryRaw<
    {
      field_key: string;
      created_at: Date;
      actor_kind: 'PLATFORM' | 'TENANT' | 'SYSTEM';
      actor_subject: string;
      actor_role: string;
    }[]
  >`
    SELECT DISTINCT ON (field_key) field_key, created_at, actor_kind, actor_subject, actor_role
      FROM store_history
     WHERE store_id = ${storeId}::uuid AND kind = 'EDIT' AND field_key IS NOT NULL
     ORDER BY field_key, created_at DESC`;

export const countOpenRequests = (tx: Tx, storeId: string) =>
  tx.storeChangeRequest.count({ where: { storeId, status: 'OPEN' } });

export type HistoryEntry = Omit<Prisma.StoreHistoryUncheckedCreateInput, 'id' | 'createdAt'>;

export const addHistory = async (tx: Tx, entries: HistoryEntry[]) => {
  if (entries.length > 0) await tx.storeHistory.createMany({ data: entries });
};

export const basicValuesOf = (store: StoreRow): Record<string, string | null> => {
  const values: Record<string, string | null> = {};
  for (const key of BASIC_FIELD_KEYS) {
    const raw = store[key];
    values[key] =
      raw instanceof Date ? raw.toISOString().slice(0, 10) : raw === null ? null : String(raw);
  }
  return values;
};

export const entriesOfKind = (store: StoreRow, kind: string) =>
  store.catalogEntries.filter((entry) => entry.catalogItem.kind === kind);

// Entrada da regra de preenchimento a partir da loja carregada (mesma conta na página e na lista).
export const completenessInputOf = (store: StoreRow, documentTypes: string[]) => ({
  basic: basicValuesOf(store),
  documentTypes,
  structure: {
    areaM2: store.areaM2,
    salesAreaM2: store.salesAreaM2,
    staffCount: store.staffCount,
    demandSystemId: store.demandSystemId,
  },
  hasOpeningHours: hasOpeningHours(store.openingHours),
  serviceCount: entriesOfKind(store, 'SERVICE').length,
  pbmCount: entriesOfKind(store, 'PBM').length,
  strategyCount: entriesOfKind(store, 'STRATEGY').length,
});

// Recalcula e grava o preenchimento (lista de Lojas filtra por estas colunas).
export const refreshCompleteness = async (tx: Tx, storeId: string) => {
  const store = await tx.store.findUniqueOrThrow({ where: { id: storeId }, include: storeInclude });
  const docs = await currentDocuments(tx, storeId);
  const result = computeCompleteness(
    completenessInputOf(
      store,
      docs.map((doc) => doc.docType),
    ),
  );
  await tx.store.update({
    where: { id: storeId },
    data: { completenessFilled: result.filled, completenessTotal: result.total },
  });
  return result;
};

// Grava com checagem de versão: se outra pessoa salvou antes, nada é sobrescrito.
export const updateStoreVersioned = async (
  tx: Tx,
  storeId: string,
  expectedVersion: number,
  data: Prisma.StoreUncheckedUpdateManyInput,
): Promise<boolean> => {
  const result = await tx.store.updateMany({
    where: { id: storeId, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });
  return result.count === 1;
};
