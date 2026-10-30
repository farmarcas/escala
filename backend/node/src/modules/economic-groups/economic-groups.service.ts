import { generatePseudonym } from '../../shared/br/pseudonym.js';
import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import { isPlatformAdmin, type PlatformIdentity } from '../../shared/identity/identity.js';
import type { AuditEntry, AuditEventView } from '../audit/audit.types.js';
import type {
  CreateGroupInput,
  GroupStatusValue,
  ListGroupsQuery,
  OwnerInput,
  StatusChangeInput,
  UpdateGroupInput,
} from './economic-groups.schemas.js';

export type OwnerRecord = { name: string; email: string; phone: string; pseudonym: string };

export type GroupSummaryRecord = {
  id: string;
  number: number;
  name: string;
  legalName: string;
  status: GroupStatusValue;
  owner: OwnerRecord | null;
  storeCount: number;
  pdvCount: number;
  cdCount: number;
  brands: string[];
  ufs: string[];
  // Lojas em operação sem revisão do cadastro há mais de 180 dias.
  outdatedStores: number;
};

export type GroupDetailRecord = GroupSummaryRecord & {
  cnpj: string;
  activeStores: number;
  inactiveStores: number;
  pendingStores: number;
  brandsBreakdown: { name: string; count: number }[];
  ufsBreakdown: { uf: string; count: number }[];
  createdAt: Date;
  updatedAt: Date;
};

export type GroupStats = {
  byStatus: { all: number; active: number; suspended: number; archived: number };
  stores: { total: number; pdv: number; cd: number };
  ufCount: number;
  withOwner: number;
  multiBrand: number;
  groupsWithCd: number;
  outdated: number;
  bySize: { size: GroupSize; groups: number; withOwner: number }[];
  byUf: { uf: string; stores: number; groups: number }[];
};

// Faixas de porte pelo número de lojas do grupo.
export type GroupSize = 'none' | 'one' | 'small' | 'medium' | 'large';

export type GroupFilter = Omit<ListGroupsQuery, 'page' | 'pageSize'> & {
  // Só o administrador busca pelo nome do proprietário; o analista não reidentifica pessoas.
  searchOwnerName: boolean;
};

export type AuditDraft = Omit<AuditEntry, 'economicGroupId'>;

export type OwnerWrite = OwnerInput & { pseudonym?: string };

export type EconomicGroupsRepository = {
  list: (
    actor: PlatformIdentity,
    filter: GroupFilter,
    page: number,
    pageSize: number,
  ) => Promise<{ data: GroupSummaryRecord[]; total: number }>;
  stats: (actor: PlatformIdentity) => Promise<GroupStats>;
  findByNumber: (actor: PlatformIdentity, number: number) => Promise<GroupDetailRecord | null>;
  create: (
    actor: PlatformIdentity,
    input: Omit<CreateGroupInput, 'owner'> & { owner?: OwnerInput & { pseudonym: string } },
    audit: AuditDraft,
  ) => Promise<GroupDetailRecord>;
  update: (
    actor: PlatformIdentity,
    groupId: string,
    input: Omit<UpdateGroupInput, 'owner'> & { owner?: OwnerWrite },
    audit: AuditDraft,
  ) => Promise<GroupDetailRecord>;
  changeStatus: (
    actor: PlatformIdentity,
    groupId: string,
    status: GroupStatusValue,
    audit: AuditDraft,
  ) => Promise<GroupDetailRecord>;
  // Grava o evento, a não ser que o mesmo ator já tenha o mesmo evento no grupo dentro da janela.
  recordAuditOnce: (
    actor: PlatformIdentity,
    groupId: string,
    audit: AuditDraft,
    withinMinutes: number,
  ) => Promise<void>;
  listAudit: (
    actor: PlatformIdentity,
    groupId: string,
    page: number,
    pageSize: number,
  ) => Promise<{ data: AuditEventView[]; total: number }>;
};

export type OwnerView = { pseudonym: string; name?: string; email?: string; phone?: string };

export type GroupBadge = 'NO_OWNER' | 'OUTDATED_STORES';

// Pseudonimização por padrão (Product Vision §6.3): o analista recebe só o código.
export const toOwnerView = (
  actor: PlatformIdentity,
  owner: OwnerRecord | null,
): OwnerView | null => {
  if (!owner) return null;
  if (!isPlatformAdmin(actor)) return { pseudonym: owner.pseudonym };
  return { ...owner };
};

const badgesOf = (group: GroupSummaryRecord): GroupBadge[] => [
  ...(group.owner ? [] : (['NO_OWNER'] as const)),
  ...(group.outdatedStores > 0 ? (['OUTDATED_STORES'] as const) : []),
];

export const toGroupSummaryView = (actor: PlatformIdentity, group: GroupSummaryRecord) => {
  const { id: _id, owner, ...rest } = group;
  return { ...rest, owner: toOwnerView(actor, owner), badges: badgesOf(group) };
};

export const toGroupDetailView = (actor: PlatformIdentity, group: GroupDetailRecord) => {
  const { id: _id, owner, ...rest } = group;
  return { ...rest, owner: toOwnerView(actor, owner), badges: badgesOf(group) };
};

const TRANSITIONS: Record<
  StatusChangeInput['action'],
  { from: GroupStatusValue[]; to: GroupStatusValue; action: string; summary: string }
> = {
  suspend: {
    from: ['ACTIVE'],
    to: 'SUSPENDED',
    action: 'GROUP_SUSPENDED',
    summary: 'Grupo suspenso',
  },
  archive: {
    from: ['ACTIVE', 'SUSPENDED'],
    to: 'ARCHIVED',
    action: 'GROUP_ARCHIVED',
    summary: 'Grupo arquivado',
  },
  restore: {
    from: ['SUSPENDED', 'ARCHIVED'],
    to: 'ACTIVE',
    action: 'GROUP_RESTORED',
    summary: 'Grupo restaurado',
  },
};

const FIELD_LABELS: Record<keyof UpdateGroupInput, string> = {
  name: 'nome',
  legalName: 'razão social',
  cnpj: 'CNPJ',
  owner: 'proprietário',
};

const notFound = () => new NotFoundError('Grupo econômico não encontrado', 'GROUP_NOT_FOUND');

// Recarregar a tela não deve encher a trilha: uma consulta por operador e grupo a cada 30 min.
export const OWNER_VIEW_WINDOW_MINUTES = 30;

export const makeEconomicGroupsService = (repo: EconomicGroupsRepository) => {
  const requireGroup = async (actor: PlatformIdentity, number: number) => {
    const group = await repo.findByNumber(actor, number);
    if (!group) throw notFound();
    return group;
  };

  return {
    async list(actor: PlatformIdentity, query: ListGroupsQuery) {
      const { page, pageSize, ...filter } = query;
      const { data, total } = await repo.list(
        actor,
        { ...filter, searchOwnerName: isPlatformAdmin(actor) },
        page,
        pageSize,
      );
      return {
        data: data.map((group) => toGroupSummaryView(actor, group)),
        meta: { page, pageSize, total },
      };
    },

    stats(actor: PlatformIdentity) {
      return repo.stats(actor);
    },

    async get(actor: PlatformIdentity, number: number) {
      const group = await requireGroup(actor, number);
      // Todo acesso do operador a dado pessoal fica na auditoria (Product Vision §9, invariante 5).
      if (group.owner && isPlatformAdmin(actor)) {
        await repo.recordAuditOnce(
          actor,
          group.id,
          { action: 'OWNER_VIEWED', summary: 'Dados pessoais do proprietário consultados' },
          OWNER_VIEW_WINDOW_MINUTES,
        );
      }
      return toGroupDetailView(actor, group);
    },

    async create(actor: PlatformIdentity, input: CreateGroupInput) {
      const { owner, ...group } = input;
      const created = await repo.create(
        actor,
        { ...group, ...(owner ? { owner: { ...owner, pseudonym: generatePseudonym() } } : {}) },
        {
          action: 'GROUP_CREATED',
          summary: owner
            ? 'Grupo cadastrado com proprietário'
            : 'Grupo cadastrado sem proprietário',
        },
      );
      return toGroupDetailView(actor, created);
    },

    async update(actor: PlatformIdentity, number: number, input: UpdateGroupInput) {
      const current = await requireGroup(actor, number);
      const { owner, ...fields } = input;
      const ownerWrite: OwnerWrite | undefined = owner
        ? { ...owner, ...(current.owner ? {} : { pseudonym: generatePseudonym() }) }
        : undefined;
      const changed = (Object.keys(input) as (keyof UpdateGroupInput)[])
        .filter((key) => input[key] !== undefined)
        .map((key) => FIELD_LABELS[key]);

      const updated = await repo.update(
        actor,
        current.id,
        { ...fields, ...(ownerWrite ? { owner: ownerWrite } : {}) },
        { action: 'GROUP_UPDATED', summary: `Dados do grupo alterados: ${changed.join(', ')}` },
      );
      return toGroupDetailView(actor, updated);
    },

    async changeStatus(actor: PlatformIdentity, number: number, input: StatusChangeInput) {
      const current = await requireGroup(actor, number);
      const transition = TRANSITIONS[input.action];
      if (!transition.from.includes(current.status)) {
        throw new ConflictError(
          'Esta mudança de status não é permitida a partir do status atual',
          'INVALID_STATUS_TRANSITION',
        );
      }

      const updated = await repo.changeStatus(actor, current.id, transition.to, {
        action: transition.action,
        summary: transition.summary,
        justification: input.justification,
      });
      return toGroupDetailView(actor, updated);
    },

    async listAudit(actor: PlatformIdentity, number: number, page: number, pageSize: number) {
      const group = await requireGroup(actor, number);
      const { data, total } = await repo.listAudit(actor, group.id, page, pageSize);
      return { data, meta: { page, pageSize, total } };
    },
  };
};

export type EconomicGroupsService = ReturnType<typeof makeEconomicGroupsService>;
