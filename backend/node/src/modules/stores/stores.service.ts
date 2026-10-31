import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import type { Identity, PlatformIdentity } from '../../shared/identity/identity.js';
import type { AuditEntry } from '../audit/audit.types.js';
import type { ValidationStatus } from '../store-page/completeness.js';
import type { GroupStatusValue } from '../economic-groups/economic-groups.schemas.js';
import type {
  CreateStoreInput,
  ListStoresQuery,
  StageChangeInput,
  StoreFilter,
  StoreStatusValue,
  StoreTypeValue,
  UpdateStoreInput,
} from './stores.schemas.js';
import { STAGE_LABEL, stageChange, type StoreStageValue } from './stage.js';

export type StoreRecord = {
  id: string;
  code: number;
  groupNumber: number;
  groupName: string;
  angel: { id: string; name: string; jobTitle: string; email: string; phone: string | null } | null;
  brand: { id: string; name: string; status: 'ACTIVE' | 'HISTORICAL' };
  name: string;
  legalName: string | null;
  type: StoreTypeValue;
  cnpj: string;
  street: string;
  number: string | null;
  district: string | null;
  zip: string | null;
  city: string;
  uf: string;
  openedAt: string | null;
  status: StoreStatusValue;
  stage: StoreStageValue;
  isBlocked: boolean;
  blockedAt: Date | null;
  blockedReason: string | null;
  // Em operação e sem mudança nem validação há mais de 90 dias (spec 003, FR-044).
  isOutdated: boolean;
  createdAt: Date;
  completeness: { filled: number; total: number; missing?: string[] };
  validation: { status: ValidationStatus; validatedAt: Date | null; days: number | null };
  docAlerts: number;
  openRequests: number;
};

export type StoreStats = {
  total: number;
  pdv: number;
  cd: number;
  active: number;
  pending: number;
  inactive: number;
  groups: number;
  // Governança (spec 002, US4).
  avgCompleteness: number;
  completenessBands: { complete: number; partial: number; low: number };
  validationAttention: number;
  docAlerts: { docs: number; stores: number };
  openRequests: { requests: number; stores: number };
};

export type StoresRepository = {
  list: (
    actor: Identity,
    filter: StoreFilter,
    page: number,
    pageSize: number,
  ) => Promise<{ data: StoreRecord[]; total: number }>;
  stats: (actor: Identity) => Promise<StoreStats>;
  findById: (actor: PlatformIdentity, id: string) => Promise<StoreRecord | null>;
  findGroup: (
    actor: PlatformIdentity,
    number: number,
  ) => Promise<{ id: string; status: GroupStatusValue } | null>;
  findBrand: (
    actor: PlatformIdentity,
    id: string,
  ) => Promise<{ id: string; status: 'ACTIVE' | 'HISTORICAL' } | null>;
  isCnpjTaken: (actor: PlatformIdentity, cnpj: string) => Promise<boolean>;
  create: (
    actor: PlatformIdentity,
    groupId: string,
    input: CreateStoreInput,
    audit: (code: number) => AuditEntry,
  ) => Promise<StoreRecord>;
  updateStatus: (
    actor: PlatformIdentity,
    id: string,
    status: UpdateStoreInput['status'],
    audit: AuditEntry,
  ) => Promise<StoreRecord>;
  findByCode: (actor: PlatformIdentity, code: number) => Promise<StoreRecord | null>;
  // Etapa e bloqueio também entram no histórico da loja.
  updateStage: (
    actor: PlatformIdentity,
    id: string,
    data: { stage: StoreStageValue; openedAt?: string },
    audit: AuditEntry,
    history: StoreHistoryChange,
  ) => Promise<StoreRecord>;
  setBlock: (
    actor: PlatformIdentity,
    id: string,
    block: { blockedAt: Date; blockedReason: string; blockedBy: string } | null,
    audit: AuditEntry,
    history: StoreHistoryChange,
  ) => Promise<StoreRecord>;
};

export type StoreHistoryChange = {
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
};

export const formatStoreCode = (code: number) => `LJ-${String(code).padStart(3, '0')}`;

const groupNotFound = () => new NotFoundError('Grupo econômico não encontrado', 'GROUP_NOT_FOUND');
const storeNotFound = () => new NotFoundError('Loja não encontrada', 'STORE_NOT_FOUND');

export const makeStoresService = (repo: StoresRepository) => ({
  async list(actor: Identity, query: ListStoresQuery) {
    const { page, pageSize, ...filter } = query;
    const { data, total } = await repo.list(actor, filter, page, pageSize);
    return { data, meta: { page, pageSize, total } };
  },

  async listByGroup(
    actor: PlatformIdentity,
    number: number,
    query: Pick<ListStoresQuery, 'page' | 'pageSize' | 'search' | 'type'>,
  ) {
    const group = await repo.findGroup(actor, number);
    if (!group) throw groupNotFound();
    const { page, pageSize, ...filter } = query;
    const { data, total } = await repo.list(
      actor,
      { ...filter, groupId: group.id },
      page,
      pageSize,
    );
    return { data, meta: { page, pageSize, total } };
  },

  stats(actor: Identity) {
    return repo.stats(actor);
  },

  async create(actor: PlatformIdentity, number: number, input: CreateStoreInput) {
    const group = await repo.findGroup(actor, number);
    if (!group) throw groupNotFound();
    if (group.status === 'ARCHIVED') {
      throw new ConflictError(
        'Grupo arquivado não recebe loja nova. Restaure o grupo antes.',
        'GROUP_ARCHIVED',
      );
    }

    const brand = await repo.findBrand(actor, input.brandId);
    if (!brand) throw new NotFoundError('Marca não encontrada', 'BRAND_NOT_FOUND');
    if (brand.status !== 'ACTIVE') {
      throw new ConflictError('Só marcas ativas podem ser usadas em loja nova', 'BRAND_INACTIVE');
    }

    if (await repo.isCnpjTaken(actor, input.cnpj)) {
      throw new ConflictError('Já existe uma loja com esse CNPJ', 'STORE_CNPJ_TAKEN');
    }

    return repo.create(actor, group.id, input, (code) => ({
      economicGroupId: group.id,
      action: 'STORE_CREATED',
      summary: `Loja ${formatStoreCode(code)} · ${input.name} cadastrada`,
    }));
  },

  async changeStage(actor: PlatformIdentity, code: number, input: StageChangeInput) {
    const store = await repo.findByCode(actor, code);
    if (!store) throw storeNotFound();
    stageChange(store.stage, input);
    const group = await repo.findGroup(actor, store.groupNumber);
    const from = STAGE_LABEL[store.stage];
    const to = STAGE_LABEL[input.stage];
    return repo.updateStage(
      actor,
      store.id,
      { stage: input.stage, ...(input.stage === 'OPENED' ? { openedAt: input.openedAt } : {}) },
      {
        economicGroupId: group?.id ?? null,
        action: 'STORE_STAGE_CHANGED',
        summary: `Loja ${formatStoreCode(store.code)} · ${store.name}: etapa ${from} → ${to}`,
        justification: input.justification ?? null,
      },
      { fieldLabel: 'Etapa', oldValue: from, newValue: to },
    );
  },

  // Bloquear corta o acesso do grupo à loja; desbloquear devolve (spec 003, FR-041/042).
  async setBlock(actor: PlatformIdentity, code: number, block: boolean, justification: string) {
    const store = await repo.findByCode(actor, code);
    if (!store) throw storeNotFound();
    if (block === store.isBlocked) {
      throw block
        ? new ConflictError('A loja já está bloqueada', 'STORE_ALREADY_BLOCKED')
        : new ConflictError('A loja não está bloqueada', 'STORE_NOT_BLOCKED');
    }
    const group = await repo.findGroup(actor, store.groupNumber);
    return repo.setBlock(
      actor,
      store.id,
      block
        ? { blockedAt: new Date(), blockedReason: justification, blockedBy: actor.subject }
        : null,
      {
        economicGroupId: group?.id ?? null,
        action: block ? 'STORE_BLOCKED' : 'STORE_UNBLOCKED',
        summary: `Loja ${formatStoreCode(store.code)} · ${store.name} ${block ? 'bloqueada' : 'desbloqueada'}`,
        justification,
      },
      {
        fieldLabel: 'Bloqueio',
        oldValue: BLOCK_LABEL[String(!block) as 'true' | 'false'],
        newValue: BLOCK_LABEL[String(block) as 'true' | 'false'],
      },
    );
  },

  async updateStatus(actor: PlatformIdentity, id: string, input: UpdateStoreInput) {
    const store = await repo.findById(actor, id);
    if (!store) throw new NotFoundError('Loja não encontrada', 'STORE_NOT_FOUND');
    if (store.status === input.status) return store;

    const group = await repo.findGroup(actor, store.groupNumber);
    if (group?.status === 'ARCHIVED') {
      throw new ConflictError(
        'Loja de grupo arquivado não muda de status. Restaure o grupo antes.',
        'GROUP_ARCHIVED',
      );
    }
    const activating = input.status === 'ACTIVE';
    return repo.updateStatus(actor, id, input.status, {
      economicGroupId: group?.id ?? null,
      action: activating ? 'STORE_ACTIVATED' : 'STORE_DEACTIVATED',
      summary: `Loja ${formatStoreCode(store.code)} · ${store.name} ${activating ? 'ativada' : 'inativada'}`,
      justification: input.justification,
    });
  },
});

export type StoresService = ReturnType<typeof makeStoresService>;

const BLOCK_LABEL = { true: 'Bloqueada', false: 'Desbloqueada' } as const;
