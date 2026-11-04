import { maskCpf } from '../../shared/br/cpf.js';
import { assertExportSize, EXPORT_LIMIT } from '../../shared/http/csv.js';
import type { FacetCount } from '../../shared/http/list-filters.js';
import { generatePseudonym } from '../../shared/br/pseudonym.js';
import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import { splitBulk } from '../../shared/bulk.js';
import { isPlatformOperator, type PlatformIdentity } from '../../shared/identity/identity.js';
import type { AuditEntry, AuditEventView } from '../audit/audit.types.js';
import type {
  BenefitCardInput,
  BulkAngelInput,
  CreateGroupInput,
  GroupStatusValue,
  GroupFacetField,
  ListGroupsQuery,
  OwnerInput,
  OwnerTransferInput,
  SetAngelInput,
  StatusChangeInput,
  UpdateGroupInput,
} from './economic-groups.schemas.js';

export type OwnerRecord = { name: string; email: string; phone: string; pseudonym: string };

// Anjo: funcionário da Farmarcas que acompanha o grupo. Pessoa da Farmarcas aparece pelo nome.
export type AngelRecord = {
  id: string;
  name: string;
  jobTitle: string;
  email: string;
  phone: string | null;
};

export type GroupSummaryRecord = {
  id: string;
  number: number;
  name: string;
  legalName: string;
  status: GroupStatusValue;
  owner: OwnerRecord | null;
  angel: AngelRecord | null;
  storeCount: number;
  pdvCount: number;
  cdCount: number;
  brands: string[];
  ufs: string[];
  // Lojas em operação sem revisão do cadastro há mais de 180 dias.
  outdatedStores: number;
};

// Cartão Alelo do grupo: dados pessoais do titular só para administrador e gestor.
export type BenefitCardRecord = {
  holderName: string;
  holderCpf: string;
  holderBirthDate: Date;
  holderPseudonym: string;
  cardNumber: string;
  store: { id: string; code: number; name: string; status: string };
};

export type GroupDetailRecord = GroupSummaryRecord & {
  benefitCard: BenefitCardRecord | null;
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
  // Administrador e gestor buscam pelo nome do proprietário; o analista não reidentifica pessoas.
  searchOwnerName: boolean;
};

export type AuditDraft = Omit<AuditEntry, 'economicGroupId'>;

export type OwnerWrite = OwnerInput & { pseudonym?: string };

export type AngelCandidate = { id: string; name: string; status: 'ACTIVE' | 'TERMINATED' };

export type AngelTarget = {
  id: string;
  number: number;
  status: GroupStatusValue;
  angel: { id: string; name: string } | null;
};

export type AngelAssignment = { groupId: string; employeeId: string | null; audit: AuditDraft };

export type EconomicGroupsRepository = {
  list: (
    actor: PlatformIdentity,
    filter: GroupFilter,
    page: number,
    pageSize: number,
  ) => Promise<{ data: GroupSummaryRecord[]; total: number }>;
  count: (actor: PlatformIdentity, filter: GroupFilter) => Promise<number>;
  facetValues: (actor: PlatformIdentity, field: GroupFacetField) => Promise<string[]>;
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
  findAngelCandidate: (
    actor: PlatformIdentity,
    employeeId: string,
  ) => Promise<AngelCandidate | null>;
  findAngelTargets: (actor: PlatformIdentity, numbers: number[]) => Promise<AngelTarget[]>;
  // Grava todas as trocas numa transação, cada uma com o seu registro na auditoria do grupo.
  assignAngels: (actor: PlatformIdentity, assignments: AngelAssignment[]) => Promise<void>;
  // O proprietário atual sai (exclusão lógica) e o novo entra, na mesma transação.
  transferOwner: (
    actor: PlatformIdentity,
    groupId: string,
    owner: OwnerInput & { pseudonym: string },
    audit: AuditDraft,
  ) => Promise<GroupDetailRecord>;
  findStoreInGroup: (
    actor: PlatformIdentity,
    groupId: string,
    code: number,
  ) => Promise<{ id: string; status: string } | null>;
  saveBenefitCard: (
    actor: PlatformIdentity,
    groupId: string,
    card: Omit<BenefitCardRecord, 'store' | 'holderBirthDate'> & {
      holderBirthDate: string;
      storeId: string;
    },
    audit: AuditDraft,
  ) => Promise<GroupDetailRecord>;
};

export type OwnerView = { pseudonym: string; name?: string; email?: string; phone?: string };

export type GroupBadge = 'NO_OWNER' | 'NO_ANGEL' | 'OUTDATED_STORES';

// Pseudonimização por padrão (Product Vision §6.3): o analista recebe só o código.
export const toOwnerView = (
  actor: PlatformIdentity,
  owner: OwnerRecord | null,
): OwnerView | null => {
  if (!owner) return null;
  if (!isPlatformOperator(actor)) return { pseudonym: owner.pseudonym };
  return { ...owner };
};

const badgesOf = (group: GroupSummaryRecord): GroupBadge[] => [
  ...(group.owner ? [] : (['NO_OWNER'] as const)),
  // Grupo arquivado não precisa de Anjo.
  ...(group.angel || group.status === 'ARCHIVED' ? [] : (['NO_ANGEL'] as const)),
  ...(group.outdatedStores > 0 ? (['OUTDATED_STORES'] as const) : []),
];

export const toGroupSummaryView = (actor: PlatformIdentity, group: GroupSummaryRecord) => {
  const { id: _id, owner, ...rest } = group;
  return { ...rest, owner: toOwnerView(actor, owner), badges: badgesOf(group) };
};

// O número do cartão nunca sai inteiro; CPF mascarado e nascimento só para administrador e gestor.
export const toBenefitCardView = (actor: PlatformIdentity, card: BenefitCardRecord | null) => {
  if (!card) return null;
  const store = { code: card.store.code, name: card.store.name, status: card.store.status };
  if (!isPlatformOperator(actor)) return { holderPseudonym: card.holderPseudonym, store };
  return {
    holderPseudonym: card.holderPseudonym,
    holderName: card.holderName,
    holderCpfMasked: maskCpf(card.holderCpf),
    holderBirthDate: card.holderBirthDate.toISOString().slice(0, 10),
    cardLast4: card.cardNumber.slice(-4),
    store,
  };
};

export const toGroupDetailView = (actor: PlatformIdentity, group: GroupDetailRecord) => {
  const { id: _id, owner, benefitCard, ...rest } = group;
  return {
    ...rest,
    owner: toOwnerView(actor, owner),
    benefitCard: toBenefitCardView(actor, benefitCard),
    badges: badgesOf(group),
  };
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

// Registro da troca de Anjo na auditoria do grupo (null = sem Anjo).
export const angelAudit = (
  current: { name: string } | null,
  next: { name: string } | null,
): AuditDraft => {
  if (!current && next) return { action: 'ANGEL_ASSIGNED', summary: `Anjo definido: ${next.name}` };
  if (current && !next) {
    return { action: 'ANGEL_REMOVED', summary: `Anjo retirado (era ${current.name})` };
  }
  return {
    action: 'ANGEL_CHANGED',
    summary: `Anjo trocado de ${current?.name ?? '—'} para ${next?.name ?? '—'}`,
  };
};

const archivedGroup = () =>
  new ConflictError('Grupo arquivado não muda de Anjo. Restaure o grupo antes.', 'GROUP_ARCHIVED');

// Recarregar a tela não deve encher a trilha: uma consulta por operador e grupo a cada 30 min.
export const OWNER_VIEW_WINDOW_MINUTES = 30;

export const makeEconomicGroupsService = (repo: EconomicGroupsRepository) => {
  const requireGroup = async (actor: PlatformIdentity, number: number) => {
    const group = await repo.findByNumber(actor, number);
    if (!group) throw notFound();
    return group;
  };

  const requireActiveEmployee = async (actor: PlatformIdentity, employeeId: string) => {
    const employee = await repo.findAngelCandidate(actor, employeeId);
    if (!employee) throw new NotFoundError('Funcionário não encontrado', 'EMPLOYEE_NOT_FOUND');
    if (employee.status !== 'ACTIVE') {
      throw new ConflictError('Só um funcionário ativo pode ser Anjo', 'EMPLOYEE_NOT_ACTIVE');
    }
    return employee;
  };

  return {
    async list(actor: PlatformIdentity, query: ListGroupsQuery) {
      const { page, pageSize, ...filter } = query;
      const { data, total } = await repo.list(
        actor,
        { ...filter, searchOwnerName: isPlatformOperator(actor) },
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

    // Quantos grupos há em cada valor do campo, com os outros filtros aplicados.
    async facets(actor: PlatformIdentity, field: GroupFacetField, query: ListGroupsQuery) {
      const { page: _page, pageSize: _pageSize, ...filter } = query;
      const base = { ...filter, searchOwnerName: isPlatformOperator(actor) };
      const data: FacetCount[] = [];
      for (const value of await repo.facetValues(actor, field)) {
        data.push({ value, count: await repo.count(actor, { ...base, [field]: [value] }) });
      }
      return { field, data };
    },

    // Todas as linhas filtradas, com a mesma pseudonimização da tela (spec 003, FR-073).
    async exportRows(actor: PlatformIdentity, query: ListGroupsQuery) {
      const { page: _page, pageSize: _pageSize, ...filter } = query;
      const { data, total } = await repo.list(
        actor,
        { ...filter, searchOwnerName: isPlatformOperator(actor) },
        1,
        EXPORT_LIMIT,
      );
      assertExportSize(total);
      return data.map((group) => toGroupSummaryView(actor, group));
    },

    async get(actor: PlatformIdentity, number: number) {
      const group = await requireGroup(actor, number);
      // Todo acesso do operador a dado pessoal fica na auditoria (Product Vision §9, invariante 5).
      if (group.owner && isPlatformOperator(actor)) {
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
      // Trocar a pessoa dona é transferência de titularidade (com justificativa), não edição:
      // senão a nova pessoa herdaria o código F-xxxx da anterior.
      if (owner && current.owner) {
        throw new ConflictError(
          'O grupo já tem proprietário. Para trocar, use Transferir titularidade (em desenvolvimento).',
          'OWNER_TRANSFER_REQUIRED',
        );
      }
      const ownerWrite: OwnerWrite | undefined = owner
        ? { ...owner, pseudonym: generatePseudonym() }
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

    async setAngel(actor: PlatformIdentity, number: number, input: SetAngelInput) {
      const current = await requireGroup(actor, number);
      if (current.status === 'ARCHIVED') throw archivedGroup();
      if ((current.angel?.id ?? null) === input.employeeId) {
        return toGroupDetailView(actor, current);
      }
      const next = input.employeeId ? await requireActiveEmployee(actor, input.employeeId) : null;
      await repo.assignAngels(actor, [
        {
          groupId: current.id,
          employeeId: next?.id ?? null,
          audit: angelAudit(current.angel, next),
        },
      ]);
      return toGroupDetailView(actor, await requireGroup(actor, number));
    },

    async bulkAngel(actor: PlatformIdentity, input: BulkAngelInput) {
      const next = await requireActiveEmployee(actor, input.employeeId);
      const numbers = [...new Set(input.numbers)];
      const targets = await repo.findAngelTargets(actor, numbers);
      const { toChange, skipped } = splitBulk(
        numbers.length,
        targets,
        (group) => group.status !== 'ARCHIVED' && group.angel?.id !== next.id,
      );
      await repo.assignAngels(
        actor,
        toChange.map((group) => ({
          groupId: group.id,
          employeeId: next.id,
          audit: angelAudit(group.angel, next),
        })),
      );
      return { changed: toChange.length, skipped };
    },

    // Trocar a pessoa dona do grupo: código novo, histórico só com códigos (spec 003, US5).
    async transferOwner(actor: PlatformIdentity, number: number, input: OwnerTransferInput) {
      const current = await requireGroup(actor, number);
      if (current.status === 'ARCHIVED') {
        throw new ConflictError(
          'Grupo arquivado não muda de proprietário. Restaure o grupo antes.',
          'GROUP_ARCHIVED',
        );
      }
      if (!current.owner) {
        throw new ConflictError(
          'O grupo não tem proprietário. Cadastre em Editar grupo.',
          'GROUP_HAS_NO_OWNER',
        );
      }
      const { justification, ...owner } = input;
      const pseudonym = generatePseudonym();
      const updated = await repo.transferOwner(
        actor,
        current.id,
        { ...owner, pseudonym },
        {
          action: 'OWNER_TRANSFERRED',
          summary: `Titularidade transferida de ${current.owner.pseudonym} para ${pseudonym}`,
          justification,
        },
      );
      return toGroupDetailView(actor, updated);
    },

    // Cartão Alelo (spec 003, US6): loja ativa do mesmo grupo; trocar de titular gera código novo.
    async setBenefitCard(actor: PlatformIdentity, number: number, input: BenefitCardInput) {
      const current = await requireGroup(actor, number);
      if (current.status === 'ARCHIVED') throw archivedGroup();
      const store = await repo.findStoreInGroup(actor, current.id, input.storeCode);
      if (!store) {
        throw new ConflictError('A loja escolhida não é deste grupo', 'STORE_NOT_IN_GROUP');
      }
      if (store.status !== 'ACTIVE') {
        throw new ConflictError('O cartão só pode ficar com uma loja ativa', 'STORE_NOT_ACTIVE');
      }
      const previous = current.benefitCard;
      const holderChanged = !previous || previous.holderCpf !== input.holderCpf;
      const pseudonym = holderChanged ? generatePseudonym() : previous.holderPseudonym;
      const { storeCode: _storeCode, ...card } = input;
      const updated = await repo.saveBenefitCard(
        actor,
        current.id,
        { ...card, holderPseudonym: pseudonym, storeId: store.id },
        !previous
          ? {
              action: 'BENEFIT_CARD_CREATED',
              summary: `Cartão Alelo cadastrado (titular ${pseudonym})`,
            }
          : holderChanged
            ? {
                action: 'BENEFIT_CARD_HOLDER_CHANGED',
                summary: `Titular do Cartão Alelo trocado de ${previous.holderPseudonym} para ${pseudonym}`,
              }
            : { action: 'BENEFIT_CARD_UPDATED', summary: 'Cartão Alelo alterado' },
      );
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
