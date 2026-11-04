import type { Prisma } from '../../../generated/prisma/client.js';
import { withActor, type Tx } from '../../../shared/database/with-actor.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ConflictError } from '../../../shared/errors/conflict-error.js';
import { ForbiddenError } from '../../../shared/errors/forbidden-error.js';
import { NotFoundError } from '../../../shared/errors/not-found-error.js';
import { ValidationError } from '../../../shared/errors/validation-error.js';
import type { Identity } from '../../../shared/identity/identity.js';
import { recordAudit } from '../../audit/audit.repository.js';
import { storeFile, type UploadedFile } from '../documents/documents.service.js';
import { DOCUMENT_LABELS } from '../fields.js';
import { ownsStep, viewerOf, type Viewer } from '../permissions.js';
import { actorLabel, sideLabel, type OwnerRef } from '../presenters.js';
import {
  addHistory,
  findStoreByCode,
  storeInclude,
  updateStoreVersioned,
  type StoreRow,
} from '../store-page.repository.js';
import { assertOpenForTenant, historyActor, loadStore, ownerOf } from '../store-page.service.js';
import type { CreateChangeRequestInput } from './change-requests.schemas.js';
import { transition, type RequestAction, type RequestState } from './transition.js';
import { REQUEST_TYPES, REQUEST_VALUES, TAX_REGIME_LABELS, type RequestType } from './types.js';

const FIELD_LABELS: Record<string, string> = {
  cnpj: 'CNPJ',
  legalName: 'Razão social',
  stateRegistration: 'Inscrição estadual',
  zip: 'CEP',
  street: 'Logradouro',
  number: 'Número',
  district: 'Bairro',
  city: 'Cidade',
  uf: 'UF',
  brandId: 'Bandeira · marca Farmarcas',
  taxRegime: 'Regime tributário',
};

const OWNER_LABEL: Record<string, string> = {
  group: 'grupo',
  platform: 'Farmarcas',
  system: 'sistema',
};

const requestInclude = {
  events: { orderBy: { createdAt: 'asc' } },
  documents: { where: { supersededAt: null }, select: { id: true, docType: true, fileName: true } },
} as const satisfies Prisma.StoreChangeRequestInclude;

type RequestRow = Prisma.StoreChangeRequestGetPayload<{ include: typeof requestInclude }>;

const notFound = () => new NotFoundError('Solicitação não encontrada', 'REQUEST_NOT_FOUND');

const stateOf = (row: RequestRow): RequestState => ({
  type: row.type,
  status: row.status,
  currentStep: row.currentStep,
  origin: row.origin === 'PLATFORM' ? 'PLATFORM' : 'TENANT',
  attachedDocuments: row.documents.map((doc) => doc.docType),
});

// Valor atual da loja, no mesmo formato dos valores pedidos.
const currentValues = (store: StoreRow): Record<string, string | null> => ({
  cnpj: store.cnpj,
  legalName: store.legalName,
  stateRegistration: store.stateRegistration,
  zip: store.zip,
  street: store.street,
  number: store.number,
  district: store.district,
  city: store.city,
  uf: store.uf,
  brandId: store.brandId,
  taxRegime: store.taxRegime,
});

const displayValue = (key: string, value: unknown, brands: Map<string, string>): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (key === 'brandId') return brands.get(String(value)) ?? String(value);
  if (key === 'taxRegime') return TAX_REGIME_LABELS[String(value)] ?? String(value);
  return String(value);
};

const actionsFor = (row: RequestRow, viewer: Viewer) => {
  if (row.status !== 'OPEN' || viewer.isReadOnly) return [];
  const definition = REQUEST_TYPES[row.type];
  const step = definition.steps[row.currentStep];
  const actions: {
    action: RequestAction;
    label: string;
    tone: 'primary' | 'danger' | 'secondary';
  }[] = [];
  if (step && ownsStep(viewer, step.owner)) {
    const isLastStep = row.currentStep === definition.steps.length - 2;
    const label =
      step.owner === 'system'
        ? 'Concluir validação'
        : step.allowsContest
          ? 'Dar ciência'
          : step.owner === 'group'
            ? step.requiresDocuments
              ? 'Concluir envio'
              : 'Concluir etapa'
            : isLastStep
              ? 'Aprovar e tornar vigente'
              : 'Aprovar etapa';
    actions.push({ action: 'advance', label, tone: 'primary' });
    if (viewer.side === 'platform')
      actions.push({ action: 'reject', label: 'Reprovar', tone: 'danger' });
    if (step.allowsContest) actions.push({ action: 'contest', label: 'Contestar', tone: 'danger' });
  }
  const isMine = (row.origin === 'PLATFORM') === (viewer.side === 'platform');
  if (isMine) actions.push({ action: 'cancel', label: 'Cancelar', tone: 'secondary' });
  return actions;
};

const presentRequest = (
  row: RequestRow,
  store: StoreRow,
  viewer: Viewer,
  owner: OwnerRef,
  brands: Map<string, string>,
) => {
  const definition = REQUEST_TYPES[row.type];
  const requested = row.requestedValues as Record<string, unknown>;
  const current = currentValues(store);
  const step = definition.steps[row.currentStep];
  const by = (kind: 'PLATFORM' | 'TENANT' | 'SYSTEM', subject: string) =>
    actorLabel(
      { kind, subject, role: kind === 'PLATFORM' ? 'PLATFORM_ADMIN' : 'TENANT_ADMIN' },
      viewer,
      owner,
    );

  return {
    id: row.id,
    type: row.type,
    title: definition.title,
    effect: definition.effect,
    status: row.status,
    version: row.version,
    origin: row.origin,
    originLabel: sideLabel(row.origin),
    requestedBy: by(row.origin, row.requestedBy),
    createdAt: row.createdAt,
    effectiveDate: row.effectiveDate ? row.effectiveDate.toISOString().slice(0, 10) : null,
    justification: row.justification,
    closedNote: row.closedNote,
    // Só o que muda: campos pedidos iguais ao atual não aparecem.
    values: Object.keys(requested)
      .filter(
        (key) =>
          row.status !== 'OPEN' || String(requested[key] ?? '') !== String(current[key] ?? ''),
      )
      .map((key) => ({
        key,
        label: FIELD_LABELS[key] ?? key,
        current: displayValue(key, current[key], brands),
        requested: displayValue(key, requested[key], brands),
      })),
    currentStep: row.currentStep,
    stepCount: definition.steps.length,
    waitingFor: step && row.status === 'OPEN' ? (OWNER_LABEL[step.owner] ?? null) : null,
    isMyTurn: row.status === 'OPEN' && Boolean(step && ownsStep(viewer, step.owner)),
    steps: definition.steps.map((item, index) => {
      const event = row.events.find((ev) => ev.stepIndex === index && ev.action !== 'OPENED');
      const opened = index === 0 ? row.events.find((ev) => ev.action === 'OPENED') : undefined;
      const done =
        index < row.currentStep || (row.status === 'EFFECTIVE' && index === row.currentStep);
      return {
        label: item.label,
        owner: OWNER_LABEL[item.owner] ?? null,
        state: done
          ? 'done'
          : index === row.currentStep && row.status === 'OPEN'
            ? 'current'
            : 'pending',
        doneAt: (event ?? opened)?.createdAt ?? null,
        doneBy:
          (event ?? opened)
            ? by((event ?? opened)!.actorKind, (event ?? opened)!.actorSubject)
            : null,
      };
    }),
    documents: definition.documents.map((docType) => {
      const attached = row.documents.find((doc) => doc.docType === docType);
      return {
        docType,
        label: DOCUMENT_LABELS[docType] ?? docType,
        attached: attached ? { id: attached.id, fileName: attached.fileName } : null,
      };
    }),
    actions: actionsFor(row, viewer),
  };
};

const brandNames = async (tx: Tx) =>
  new Map(
    (await tx.brand.findMany({ select: { id: true, name: true } })).map((b) => [b.id, b.name]),
  );

const loadRequest = async (tx: Tx, identity: Identity, id: string) => {
  const row = await tx.storeChangeRequest.findFirst({ where: { id }, include: requestInclude });
  if (!row) throw notFound();
  const store = await tx.store.findFirst({
    where: { id: row.storeId },
    include: storeInclude,
  });
  if (!store) throw notFound();
  assertOpenForTenant(identity, store);
  return { row, store, viewer: viewerOf(identity, store.economicGroup.status) };
};

// Aplica os valores pedidos na loja quando a solicitação fica vigente.
const applyToStore = async (tx: Tx, identity: Identity, row: RequestRow, store: StoreRow) => {
  const values = row.requestedValues as Record<string, string>;
  if (row.type === 'CNPJ') {
    const taken = await tx.store.findFirst({
      where: { cnpj: values.cnpj, deletedAt: null, NOT: { id: store.id } },
      select: { id: true },
    });
    if (taken) throw new ConflictError('Já existe outra loja com esse CNPJ', 'STORE_CNPJ_TAKEN');
  }
  if (row.type === 'BRAND') {
    const brand = await tx.brand.findFirst({
      where: { id: values.brandId, deletedAt: null },
      select: { status: true },
    });
    if (brand?.status !== 'ACTIVE')
      throw new ConflictError('A nova marca não está ativa', 'BRAND_INACTIVE');
  }
  if (!(await updateStoreVersioned(tx, store.id, store.version, values))) {
    throw new ConflictError(
      'A loja mudou durante a aprovação. Tente de novo.',
      'STORE_VERSION_CONFLICT',
    );
  }
  const brands = await brandNames(tx);
  const current = currentValues(store);
  await addHistory(
    tx,
    Object.keys(values)
      .filter((key) => values[key] !== current[key])
      .map((key) => ({
        storeId: store.id,
        economicGroupId: store.economicGroupId,
        kind: 'REQUEST' as const,
        fieldKey: key,
        fieldLabel: FIELD_LABELS[key] ?? key,
        oldValue: displayValue(key, current[key], brands),
        newValue: displayValue(key, values[key], brands),
        requestId: row.id,
        ...historyActor(identity),
      })),
  );
};

export const changeRequestsService = {
  list(identity: Identity, code: number, status: 'OPEN' | 'ALL') {
    return withActor(identity, async (tx) => {
      const { store, viewer } = await loadStore(tx, identity, code);
      const rows = await tx.storeChangeRequest.findMany({
        where: { storeId: store.id, ...(status === 'OPEN' ? { status: 'OPEN' as const } : {}) },
        include: requestInclude,
        orderBy: { createdAt: 'desc' },
      });
      const brands = await brandNames(tx);
      return {
        data: rows.map((row) => presentRequest(row, store, viewer, ownerOf(store), brands)),
      };
    });
  },

  create(identity: Identity, code: number, input: CreateChangeRequestInput) {
    return withActor(identity, async (tx) => {
      const { store, viewer, permissions } = await loadStore(tx, identity, code);
      if (!permissions.canOpenRequest) throw new ForbiddenError('Somente leitura');
      const type = input.type as RequestType;
      const parsed = REQUEST_VALUES[type].safeParse(input.values);
      if (!parsed.success) {
        throw new ValidationError(
          'Revise os valores pedidos',
          parsed.error.issues.map((issue) => ({
            path: `values.${issue.path.join('.')}`,
            message: issue.message,
          })),
        );
      }
      const values = parsed.data as Record<string, string>;
      const current = currentValues(store);
      if (Object.keys(values).every((key) => values[key] === current[key])) {
        throw new AppError('Os valores pedidos são iguais aos atuais', 400, 'NOTHING_TO_CHANGE');
      }
      if (
        await tx.storeChangeRequest.findFirst({
          where: { storeId: store.id, type, status: 'OPEN' },
          select: { id: true },
        })
      ) {
        throw new ConflictError(
          `Já existe ${REQUEST_TYPES[type].title.toLowerCase()} em andamento`,
          'REQUEST_ALREADY_OPEN',
        );
      }
      if (
        type === 'CNPJ' &&
        (await tx.store.findFirst({
          where: { cnpj: values.cnpj, NOT: { id: store.id }, deletedAt: null },
          select: { id: true },
        }))
      ) {
        throw new ConflictError('Já existe outra loja com esse CNPJ', 'STORE_CNPJ_TAKEN');
      }
      if (type === 'BRAND') {
        const brand = await tx.brand.findFirst({
          where: { id: values.brandId, deletedAt: null },
          select: { status: true },
        });
        if (brand?.status !== 'ACTIVE')
          throw new ConflictError('Escolha uma marca ativa', 'BRAND_INACTIVE');
      }

      const actor = historyActor(identity);
      const created = await tx.storeChangeRequest.create({
        data: {
          storeId: store.id,
          economicGroupId: store.economicGroupId,
          type,
          origin: actor.actorKind,
          requestedBy: identity.subject,
          requestedValues: values,
          effectiveDate: input.effectiveDate
            ? new Date(`${input.effectiveDate}T00:00:00.000Z`)
            : null,
          justification: input.justification,
          events: {
            create: {
              stepIndex: 0,
              action: 'OPENED',
              actorKind: actor.actorKind,
              actorSubject: identity.subject,
            },
          },
        },
        include: requestInclude,
      });
      await addHistory(tx, [
        {
          storeId: store.id,
          economicGroupId: store.economicGroupId,
          kind: 'REQUEST',
          fieldLabel: `${REQUEST_TYPES[type].title} · aberta`,
          newValue: Object.values(values).join(', '),
          justification: input.justification,
          requestId: created.id,
          ...actor,
        },
      ]);
      await recordAudit(
        tx,
        { subject: identity.subject, role: identity.role },
        {
          economicGroupId: store.economicGroupId,
          action: 'STORE_CHANGE_REQUESTED',
          summary: `${REQUEST_TYPES[type].title} pedida para a loja ${store.name}`,
          justification: input.justification,
        },
      );
      return presentRequest(created, store, viewer, ownerOf(store), await brandNames(tx));
    });
  },

  act(
    identity: Identity,
    id: string,
    action: RequestAction,
    note: string | undefined,
    expectedVersion: number,
  ) {
    return withActor(identity, async (tx) => {
      const { row, store, viewer } = await loadRequest(tx, identity, id);
      if (row.version !== expectedVersion) {
        throw new ConflictError(
          'A solicitação mudou. Recarregue para ver a etapa atual.',
          'REQUEST_VERSION_CONFLICT',
        );
      }
      const result = transition(stateOf(row), action, viewer, note);
      const actor = historyActor(identity);
      if (result.becameEffective) await applyToStore(tx, identity, row, store);

      const updated = await tx.storeChangeRequest.updateMany({
        where: { id: row.id, version: expectedVersion },
        data: {
          status: result.status,
          currentStep: result.currentStep,
          closedNote: note?.trim() || null,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ConflictError(
          'A solicitação mudou. Recarregue para ver a etapa atual.',
          'REQUEST_VERSION_CONFLICT',
        );
      }
      await tx.storeChangeRequestEvent.create({
        data: {
          requestId: row.id,
          stepIndex: result.stepIndex,
          action: result.eventAction,
          actorKind: actor.actorKind,
          actorSubject: identity.subject,
          note: note?.trim() || null,
        },
      });
      if (result.status !== 'OPEN') {
        const title = REQUEST_TYPES[row.type].title;
        const outcome = {
          EFFECTIVE: 'vigente',
          REJECTED: 'reprovada',
          CONTESTED: 'contestada',
          CANCELLED: 'cancelada',
          OPEN: '',
        }[result.status];
        await addHistory(tx, [
          {
            storeId: store.id,
            economicGroupId: store.economicGroupId,
            kind: 'REQUEST',
            fieldLabel: `${title} · ${outcome}`,
            justification: note?.trim() || null,
            requestId: row.id,
            ...actor,
          },
        ]);
        await recordAudit(
          tx,
          { subject: identity.subject, role: identity.role },
          {
            economicGroupId: store.economicGroupId,
            action: `STORE_CHANGE_${result.status}`,
            summary: `${title} ${outcome} na loja ${store.name}`,
            justification: note?.trim() || null,
          },
        );
      }
      const fresh = await tx.storeChangeRequest.findUniqueOrThrow({
        where: { id: row.id },
        include: requestInclude,
      });
      const freshStore = (await findStoreByCode(tx, store.code)) ?? store;
      return presentRequest(fresh, freshStore, viewer, ownerOf(freshStore), await brandNames(tx));
    });
  },

  attach(identity: Identity, id: string, docType: string, file: UploadedFile) {
    return withActor(identity, async (tx) => {
      const { row, store, viewer } = await loadRequest(tx, identity, id);
      if (viewer.isReadOnly) throw new ForbiddenError('Somente leitura');
      if (row.status !== 'OPEN')
        throw new ConflictError('Esta solicitação já foi encerrada', 'REQUEST_CLOSED');
      if (!REQUEST_TYPES[row.type].documents.includes(docType)) {
        throw new AppError(
          'Este documento não é pedido nesta solicitação',
          400,
          'DOCUMENT_TYPE_INVALID',
        );
      }
      await tx.storeDocument.updateMany({
        where: { requestId: row.id, docType: docType as 'CNPJ_CARD', supersededAt: null },
        data: { supersededAt: new Date() },
      });
      await storeFile(tx, identity, {
        storeId: store.id,
        economicGroupId: store.economicGroupId,
        docType,
        requestId: row.id,
        validUntil: null,
        file,
      });
      await addHistory(tx, [
        {
          storeId: store.id,
          economicGroupId: store.economicGroupId,
          kind: 'DOCUMENT',
          fieldLabel: `${DOCUMENT_LABELS[docType] ?? docType} · ${REQUEST_TYPES[row.type].title}`,
          newValue: file.name,
          requestId: row.id,
          ...historyActor(identity),
        },
      ]);
      const fresh = await tx.storeChangeRequest.findUniqueOrThrow({
        where: { id: row.id },
        include: requestInclude,
      });
      return presentRequest(fresh, store, viewer, ownerOf(store), await brandNames(tx));
    });
  },
};
