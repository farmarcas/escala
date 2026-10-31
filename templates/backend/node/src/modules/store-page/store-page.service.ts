import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ConflictError } from '../../shared/errors/conflict-error.js';
import { ForbiddenError } from '../../shared/errors/forbidden-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import { ValidationError } from '../../shared/errors/validation-error.js';
import type { Identity } from '../../shared/identity/identity.js';
import { recordAudit } from '../audit/audit.repository.js';
import { computeCompleteness, documentStatus, validationStatus } from './completeness.js';
import { BASIC_FIELDS, REQUEST_ONLY_FIELDS, type BasicFieldKey } from './fields.js';
import { permissionsOf, viewerOf, type Viewer } from './permissions.js';
import { actorLabel, maskIf, sideLabel, type OwnerRef } from './presenters.js';
import { applyStructureEdit, hoursOf, structureService } from './structure/structure.service.js';
import { toolsChannelsService } from './structure/tools-channels.service.js';
import {
  addHistory,
  basicValuesOf,
  completenessInputOf,
  entriesOfKind,
  countOpenRequests,
  currentDocuments,
  findStoreByCode,
  lastEditsByField,
  refreshCompleteness,
  updateStoreVersioned,
  type HistoryEntry,
  type StoreRow,
} from './store-page.repository.js';

export { toolsChannelsService };
import type { UpdateStoreInput } from './store-page.schemas.js';

export const storeNotFound = () => new NotFoundError('Loja não encontrada', 'STORE_NOT_FOUND');
export const versionConflict = () =>
  new ConflictError(
    'Esta loja mudou desde que você abriu. Recarregue para ver a versão atual.',
    'STORE_VERSION_CONFLICT',
  );

const actorKindOf = (identity: Identity): 'PLATFORM' | 'TENANT' =>
  identity.kind === 'platform' ? 'PLATFORM' : 'TENANT';

export const ownerOf = (store: StoreRow): OwnerRef => store.economicGroup.owners[0] ?? null;

// Carrega a loja visível para o ator e quem está vendo. 404 inclui "loja de outro grupo".
export const loadStore = async (tx: Tx, identity: Identity, code: number) => {
  const store = await findStoreByCode(tx, code);
  if (!store) throw storeNotFound();
  const viewer = viewerOf(identity, store.economicGroup.status);
  return { store, viewer, permissions: permissionsOf(viewer) };
};

export const historyActor = (identity: Identity) => ({
  actorKind: actorKindOf(identity),
  actorSubject: identity.subject,
  actorRole: identity.role,
});

const todayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const buildPage = async (tx: Tx, store: StoreRow, viewer: Viewer) => {
  const permissions = permissionsOf(viewer);
  const owner = ownerOf(store);
  const docs = await currentDocuments(tx, store.id);
  const edits = await lastEditsByField(tx, store.id);
  const openRequests = await countOpenRequests(tx, store.id);
  const today = todayUtc();
  const hidePrivate = !permissions.canSeeOwnerPrivate;
  const basic = basicValuesOf(store);
  const validation = validationStatus(store.validatedAt, today);
  const completeness = computeCompleteness(
    completenessInputOf(
      store,
      docs.map((doc) => doc.docType),
    ),
  );

  return {
    code: store.code,
    version: store.version,
    side: viewer.side,
    isReadOnly: viewer.isReadOnly,
    group: {
      number: store.economicGroup.number,
      name: store.economicGroup.name,
      status: store.economicGroup.status,
    },
    status: store.status,
    type: store.type,
    receita: {
      cnpj: store.cnpj,
      stateRegistration: store.stateRegistration,
      legalName: store.legalName,
      zip: store.zip,
      street: store.street,
      number: store.number,
      district: store.district,
      city: store.city,
      uf: store.uf,
    },
    business: {
      brand: store.brand,
      taxRegime: store.taxRegime,
    },
    basic: {
      ...basic,
      ownerMobile: maskIf(hidePrivate, basic.ownerMobile ?? null),
      ownerPersonalEmail: maskIf(hidePrivate, basic.ownerPersonalEmail ?? null),
    },
    fieldMeta: Object.fromEntries(
      edits.map((edit) => [
        edit.field_key,
        {
          at: edit.created_at,
          side: edit.actor_kind,
          by: actorLabel(
            { kind: edit.actor_kind, subject: edit.actor_subject, role: edit.actor_role },
            viewer,
            owner,
          ),
        },
      ]),
    ),
    governance: {
      filled: completeness.filled,
      total: completeness.total,
      missing: completeness.missing,
      validation: {
        status: validation.status,
        days: validation.days,
        dueAt: validation.dueAt,
        validatedAt: store.validatedAt,
        validatedBy: store.validatedBy
          ? actorLabel(
              { kind: 'TENANT', subject: store.validatedBy, role: 'TENANT_ADMIN' },
              viewer,
              owner,
            )
          : null,
        remindedAt: store.validationRemindedAt,
      },
    },
    structure: {
      ownBuilding: store.ownBuilding,
      areaM2: store.areaM2,
      salesAreaM2: store.salesAreaM2,
      staffCount: store.staffCount,
      demandSystemId: store.demandSystemId,
    },
    hours: hoursOf(store),
    selections: {
      services: entriesOfKind(store, 'SERVICE').map((entry) => entry.catalogItemId),
      practiceTools: entriesOfKind(store, 'PRACTICE_TOOL').map((entry) => entry.catalogItemId),
      pbms: entriesOfKind(store, 'PBM').map((entry) => entry.catalogItemId),
    },
    strategies: entriesOfKind(store, 'STRATEGY').map((entry) => ({
      itemId: entry.catalogItemId,
      since: entry.since ? entry.since.toISOString().slice(0, 10) : null,
    })),
    furniture: entriesOfKind(store, 'FURNITURE').map((entry) => ({
      itemId: entry.catalogItemId,
      quantity: entry.quantity ?? 0,
      tradeQuantity: entry.tradeQuantity ?? 0,
    })),
    freeSections: store.freeSections.map((section) => ({
      id: section.id,
      title: section.title,
      createdBy: section.createdBy,
      fields: section.fields.map((field) => ({
        id: field.id,
        label: field.label,
        value: field.value,
      })),
    })),
    tools: entriesOfKind(store, 'EXTERNAL_TOOL').map((entry) => ({
      itemId: entry.catalogItemId,
      uses: entry.uses,
      monthlyCostCents: entry.monthlyCostCents,
    })),
    channels: entriesOfKind(store, 'CHANNEL').map((entry) => ({
      itemId: entry.catalogItemId,
      uses: entry.uses,
      identifier: entry.identifier,
    })),
    customEntries: store.customEntries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      name: entry.name,
      category: entry.category,
      identifier: entry.identifier,
      monthlyCostCents: entry.monthlyCostCents,
    })),
    noExternalTools: store.noExternalTools,
    // Responsáveis: o proprietário vem do cadastro do grupo (mascarado para o analista).
    owner: owner
      ? permissions.canSeeOwnerPrivate
        ? {
            pseudonym: owner.pseudonym,
            name: owner.name,
            email: store.economicGroup.owners[0]?.email ?? null,
            phone: store.economicGroup.owners[0]?.phone ?? null,
          }
        : { pseudonym: owner.pseudonym, name: null, email: null, phone: null }
      : null,
    // Anjo: funcionário da Farmarcas que acompanha o grupo; aparece pelo nome para os dois lados.
    angel: store.economicGroup.angel ?? null,
    documentAlerts: docs.filter((doc) => documentStatus(doc.validUntil, today) !== 'valid').length,
    openRequests,
    permissions,
  };
};

export type StorePage = Awaited<ReturnType<typeof buildPage>>;

const normalizeOld = (value: string | null | undefined) => (value === undefined ? null : value);

export const storePageService = {
  get(identity: Identity, code: number) {
    return withActor(identity, async (tx) => {
      const { store, viewer } = await loadStore(tx, identity, code);
      return buildPage(tx, store, viewer);
    });
  },

  update(identity: Identity, code: number, input: UpdateStoreInput) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      if (!permissions.canEditBasic) throw new ForbiddenError('Somente leitura');
      const reason = input.reason?.trim();
      if (permissions.requiresReason && !reason) {
        throw new AppError('Informe o motivo da correção', 400, 'REASON_REQUIRED');
      }

      const before = basicValuesOf(store);
      const changes: Partial<Record<BasicFieldKey, string | null>> = {};
      const issues: { path: string; message: string }[] = [];

      for (const [key, raw] of Object.entries(input.basic ?? {})) {
        if ((REQUEST_ONLY_FIELDS as readonly string[]).includes(key)) {
          throw new AppError(
            'Este dado só muda por solicitação, com etapas e documentos',
            400,
            'FIELD_REQUIRES_REQUEST',
            [{ path: `basic.${key}`, message: 'Use a solicitação de mudança' }],
          );
        }
        if (!(key in BASIC_FIELDS)) {
          issues.push({ path: `basic.${key}`, message: 'Campo desconhecido' });
          continue;
        }
        const field = BASIC_FIELDS[key as BasicFieldKey];
        if ('isOwnerPrivate' in field && field.isOwnerPrivate && !permissions.canEditOwnerPrivate) {
          throw new ForbiddenError(
            'Só o grupo altera os dados pessoais do proprietário',
            'OWNER_PRIVATE_FIELD',
          );
        }
        let value: string | null = null;
        if (raw !== null && raw.trim() !== '') {
          const parsed = field.schema.safeParse(raw);
          if (!parsed.success) {
            issues.push({
              path: `basic.${key}`,
              message: parsed.error.issues[0]?.message ?? 'Inválido',
            });
            continue;
          }
          value = parsed.data;
        }
        if (key === 'name' && !value) {
          issues.push({ path: 'basic.name', message: 'O apelido não pode ficar vazio' });
          continue;
        }
        if (value !== normalizeOld(before[key])) changes[key as BasicFieldKey] = value;
      }
      if (issues.length > 0) throw new ValidationError('Revise os campos destacados', issues);
      const keys = Object.keys(changes) as BasicFieldKey[];
      const actor = historyActor(identity);
      const structure = await applyStructureEdit(
        tx,
        store,
        input,
        permissions,
        actor,
        reason ?? null,
      );
      if (keys.length === 0 && structure.history.length === 0) return buildPage(tx, store, viewer);

      const data: Record<string, unknown> = { ...structure.storeData };
      for (const key of keys) {
        const value = changes[key] ?? null;
        data[key] = key === 'openedAt' && value ? new Date(`${value}T00:00:00.000Z`) : value;
      }
      if (!(await updateStoreVersioned(tx, store.id, input.expectedVersion, data))) {
        throw versionConflict();
      }

      await addHistory(tx, structure.history);
      await addHistory(
        tx,
        keys.map<HistoryEntry>((key) => ({
          storeId: store.id,
          economicGroupId: store.economicGroupId,
          kind: 'EDIT',
          fieldKey: key,
          fieldLabel: BASIC_FIELDS[key].label,
          oldValue: before[key] ?? null,
          newValue: changes[key] ?? null,
          justification: reason ?? null,
          ...actor,
        })),
      );
      await refreshCompleteness(tx, store.id);
      const { store: fresh } = await loadStore(tx, identity, code);
      return buildPage(tx, fresh, viewer);
    });
  },

  validate(identity: Identity, code: number, expectedVersion: number) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      if (!permissions.canValidate) throw new ForbiddenError('Só o grupo valida os dados da loja');
      const completeness = await refreshCompleteness(tx, store.id);
      if (completeness.filled < completeness.total) {
        throw new ConflictError('Preencha os campos pendentes antes de validar', 'INCOMPLETE');
      }
      const now = new Date();
      if (
        !(await updateStoreVersioned(tx, store.id, expectedVersion, {
          validatedAt: now,
          validatedBy: identity.subject,
        }))
      ) {
        throw versionConflict();
      }
      await addHistory(tx, [
        {
          storeId: store.id,
          economicGroupId: store.economicGroupId,
          kind: 'VALIDATION',
          fieldLabel: 'Validação semestral dos dados',
          oldValue: store.validatedAt
            ? `Validada em ${store.validatedAt.toISOString().slice(0, 10)}`
            : null,
          newValue: 'Validada',
          ...historyActor(identity),
        },
      ]);
      const { store: fresh } = await loadStore(tx, identity, code);
      return buildPage(tx, fresh, viewer);
    });
  },

  // Ferramentas, canais e itens próprios: grava, sobe a versão e devolve a página atualizada.
  toolsAndChannels(
    identity: Identity,
    code: number,
    write: (
      tx: Tx,
      store: StoreRow,
      permissions: ReturnType<typeof permissionsOf>,
      actor: ReturnType<typeof historyActor>,
    ) => Promise<boolean>,
  ) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      if (await write(tx, store, permissions, historyActor(identity))) {
        await tx.store.update({ where: { id: store.id }, data: { version: { increment: 1 } } });
      }
      const { store: fresh } = await loadStore(tx, identity, code);
      return buildPage(tx, fresh, viewer);
    });
  },

  setStrategies(identity: Identity, code: number, itemIds: string[]) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      if (
        await structureService.setStrategies(
          tx,
          store,
          permissions,
          historyActor(identity),
          itemIds,
        )
      ) {
        await tx.store.update({ where: { id: store.id }, data: { version: { increment: 1 } } });
      }
      const { store: fresh } = await loadStore(tx, identity, code);
      return buildPage(tx, fresh, viewer);
    });
  },

  setFurniture(
    identity: Identity,
    code: number,
    itemId: string,
    quantity: number,
    tradeQuantity: number,
  ) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      if (
        await structureService.setFurniture(
          tx,
          store,
          permissions,
          historyActor(identity),
          itemId,
          quantity,
          tradeQuantity,
        )
      ) {
        await tx.store.update({ where: { id: store.id }, data: { version: { increment: 1 } } });
      }
      const { store: fresh } = await loadStore(tx, identity, code);
      return buildPage(tx, fresh, viewer);
    });
  },

  remind(identity: Identity, code: number) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      if (!permissions.canRemind)
        throw new ForbiddenError('Só o Administrador da plataforma cobra a validação');
      if (validationStatus(store.validatedAt, todayUtc()).status === 'ok') {
        throw new ConflictError('A validação desta loja está em dia', 'VALIDATION_UP_TO_DATE');
      }
      await tx.store.update({
        where: { id: store.id },
        data: { validationRemindedAt: new Date() },
      });
      await addHistory(tx, [
        {
          storeId: store.id,
          economicGroupId: store.economicGroupId,
          kind: 'REMINDER',
          fieldLabel: 'Cobrança de validação dos dados',
          newValue: 'Enviada ao proprietário',
          ...historyActor(identity),
        },
      ]);
      await recordAudit(
        tx,
        { subject: identity.subject, role: identity.role },
        {
          economicGroupId: store.economicGroupId,
          action: 'STORE_VALIDATION_REMINDED',
          summary: `Cobrança de validação da loja ${store.name}`,
        },
      );
      const { store: fresh } = await loadStore(tx, identity, code);
      return buildPage(tx, fresh, viewer);
    });
  },

  history(
    identity: Identity,
    code: number,
    query: { page: number; pageSize: number; kind?: string },
  ) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      const owner = ownerOf(store);
      const where = {
        storeId: store.id,
        ...(query.kind ? { kind: query.kind as 'EDIT' } : {}),
      };
      const rows = await tx.storeHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await tx.storeHistory.count({ where });
      const hidePrivate = !permissions.canSeeOwnerPrivate;
      const privateKeys = ['ownerMobile', 'ownerPersonalEmail'];
      return {
        data: rows.map((row) => {
          const isPrivate =
            hidePrivate && row.fieldKey !== null && privateKeys.includes(row.fieldKey);
          return {
            id: row.id,
            at: row.createdAt,
            kind: row.kind,
            fieldLabel: row.fieldLabel,
            oldValue: maskIf(isPrivate, row.oldValue),
            newValue: maskIf(isPrivate, row.newValue),
            justification: row.justification,
            side: row.actorKind,
            sideLabel: sideLabel(row.actorKind),
            by: actorLabel(
              { kind: row.actorKind, subject: row.actorSubject, role: row.actorRole },
              viewer,
              owner,
            ),
          };
        }),
        meta: { page: query.page, pageSize: query.pageSize, total },
      };
    });
  },
};
