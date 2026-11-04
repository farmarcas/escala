import { Prisma } from '../../generated/prisma/client.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { recordAudit } from '../audit/audit.repository.js';
import { validationStatus } from '../store-page/completeness.js';
import {
  addHistory,
  missingFieldsByStore,
  refreshCompleteness,
} from '../store-page/store-page.repository.js';
import { NO_ANGEL } from '../../shared/http/list-filters.js';
import { STORE_ALERTS, type StoreFilter, type StoreStatusValue } from './stores.schemas.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import type { AuditEntry } from '../audit/audit.types.js';
import type { StoreHistoryChange, StoreRecord, StoresRepository } from './stores.service.js';
import { ANGEL_SELECT, toAngelView } from '../employees/angel-view.js';

// Loja em operação sem mudança de cadastro nem validação há mais deste prazo (spec 003, R9).
const OUTDATED_DAYS = 90;

// Documento com alerta: vencido ou vencendo nos próximos 30 dias.
const ALERT_DAYS = 30;
function alertLimit() {
  return new Date(Date.now() + ALERT_DAYS * 86_400_000);
}

// Função, e não constante: o limite de 30 dias do alerta de documento é calculado a cada consulta.
const storeSelect = () =>
  ({
    id: true,
    legalName: true,
    code: true,
    name: true,
    type: true,
    cnpj: true,
    street: true,
    number: true,
    district: true,
    zip: true,
    city: true,
    uf: true,
    openedAt: true,
    status: true,
    stage: true,
    blockedAt: true,
    blockedReason: true,
    createdAt: true,
    // Última edição ou validação: base do alerta de dados desatualizados.
    history: {
      where: { kind: { in: ['EDIT', 'VALIDATION'] } },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { createdAt: true },
    },
    completenessFilled: true,
    completenessTotal: true,
    validatedAt: true,
    brand: { select: { id: true, name: true, status: true } },
    economicGroup: {
      select: {
        number: true,
        name: true,
        angel: { select: ANGEL_SELECT },
      },
    },
    _count: {
      select: {
        changeRequests: { where: { status: 'OPEN' } },
        documents: {
          where: { supersededAt: null, requestId: null, validUntil: { lt: alertLimit() } },
        },
      },
    },
  }) as const satisfies Prisma.StoreSelect;

type StoreRow = Prisma.StoreGetPayload<{ select: ReturnType<typeof storeSelect> }>;

const isOutdated = (row: {
  status: string;
  history: { createdAt: Date }[];
  validatedAt: Date | null;
  createdAt: Date;
}) => {
  const lastTouch = Math.max(
    (row.history[0]?.createdAt ?? row.createdAt).getTime(),
    (row.validatedAt ?? row.createdAt).getTime(),
  );
  return row.status !== 'INACTIVE' && lastTouch < Date.now() - OUTDATED_DAYS * 86_400_000;
};

const toRecord = (row: StoreRow): StoreRecord => ({
  id: row.id,
  code: row.code,
  groupNumber: row.economicGroup.number,
  groupName: row.economicGroup.name,
  angel: row.economicGroup.angel ? toAngelView(row.economicGroup.angel) : null,
  brand: row.brand,
  name: row.name,
  legalName: row.legalName,
  type: row.type,
  cnpj: row.cnpj,
  street: row.street,
  number: row.number,
  district: row.district,
  zip: row.zip,
  city: row.city,
  uf: row.uf,
  openedAt: row.openedAt ? row.openedAt.toISOString().slice(0, 10) : null,
  status: row.status,
  stage: row.stage,
  isBlocked: row.blockedAt !== null,
  blockedAt: row.blockedAt,
  blockedReason: row.blockedReason,
  isOutdated: isOutdated(row),
  createdAt: row.createdAt,
  completeness: { filled: row.completenessFilled, total: row.completenessTotal },
  validation: {
    ...validationStatus(row.validatedAt, new Date()),
    validatedAt: row.validatedAt,
  },
  docAlerts: row._count.documents,
  openRequests: row._count.changeRequests,
});

const whereOf = (filter: StoreFilter): Prisma.StoreWhereInput => {
  const where: Prisma.StoreWhereInput = { deletedAt: null };
  if (filter.groupId) where.economicGroupId = filter.groupId;
  if (filter.type) where.type = filter.type;
  const and: Prisma.StoreWhereInput[] = [];
  // Situação: os valores somam; "Em operação" é ativa ou pendente de grupo não arquivado.
  if (filter.status) {
    const plain = filter.status.filter((value) => value !== 'OPERATING') as StoreStatusValue[];
    const or: Prisma.StoreWhereInput[] = [];
    if (plain.length) or.push({ status: { in: plain } });
    if (filter.status.includes('OPERATING')) {
      or.push({ status: { not: 'INACTIVE' }, economicGroup: { status: { not: 'ARCHIVED' } } });
    }
    and.push({ OR: or });
  }
  // O Anjo é do grupo: as lojas mostram o Anjo do grupo (spec 003, US2). NONE = sem Anjo.
  if (filter.angelId) {
    const ids = filter.angelId.filter((value) => value !== NO_ANGEL);
    const or: Prisma.StoreWhereInput[] = [];
    if (ids.length) or.push({ economicGroup: { angelEmployeeId: { in: ids } } });
    if (filter.angelId.includes(NO_ANGEL)) or.push({ economicGroup: { angelEmployeeId: null } });
    and.push({ OR: or });
  }
  if (filter.brandId) where.brandId = { in: filter.brandId };
  if (filter.stage) where.stage = { in: filter.stage };
  if (filter.codes) where.code = { in: filter.codes };
  // Bloqueadas e desbloqueadas juntas = sem filtro.
  if (filter.blocked?.length === 1) {
    where.blockedAt = filter.blocked[0] === 'true' ? { not: null } : null;
  }
  if (filter.uf) where.uf = { in: filter.uf };
  if (and.length) where.AND = and;
  if (filter.search) {
    const text = { contains: filter.search, mode: 'insensitive' } as const;
    const digits = filter.search.replace(/\D/g, '');
    const or: Prisma.StoreWhereInput[] = [
      { name: text },
      { city: text },
      { economicGroup: { name: text } },
    ];
    // Com 4 dígitos ou mais, acha em qualquer parte do CNPJ (ex.: "0002" para a filial).
    if (digits.length >= 4) or.push({ cnpj: { contains: digits } });
    else if (digits.length >= 2) or.push({ cnpj: { startsWith: digits } });
    if (/^\s*(ge\s*)?\d{1,9}\s*$/i.test(filter.search)) {
      or.push({ economicGroup: { number: Number(digits) } });
    }
    if (/^\s*lj-?\d{1,9}\s*$/i.test(filter.search)) or.push({ code: Number(digits) });
    where.OR = or;
  }
  return where;
};

const VALIDATION_SQL: Record<string, Prisma.Sql> = {
  never: Prisma.sql`validated_at IS NULL`,
  overdue: Prisma.sql`validated_at + interval '6 months' < now()`,
  due_soon: Prisma.sql`validated_at + interval '6 months' BETWEEN now() AND now() + interval '30 days'`,
  ok: Prisma.sql`validated_at + interval '6 months' > now() + interval '30 days'`,
  // Loja inativa não é cobrada pela validação (spec 002, casos de borda).
  attention: Prisma.sql`status <> 'INACTIVE' AND (validated_at IS NULL OR validated_at + interval '6 months' < now())`,
};

const COMPLETENESS_SQL: Record<string, Prisma.Sql> = {
  complete: Prisma.sql`completeness_total > 0 AND completeness_filled >= completeness_total`,
  partial: Prisma.sql`completeness_filled < completeness_total AND completeness_filled * 100 >= completeness_total * 80`,
  // Loja ainda sem cálculo (total 0) conta como "falta muito".
  low: Prisma.sql`(completeness_total = 0 OR completeness_filled * 100 < completeness_total * 80)`,
};

// Filtros de governança viram uma lista de ids calculada no banco.
const ALERT_SQL: Record<(typeof STORE_ALERTS)[number], Prisma.Sql> = {
  request: Prisma.sql`EXISTS (SELECT 1 FROM store_change_requests r WHERE r.store_id = stores.id AND r.status = 'OPEN')`,
  // Última mudança de verdade: edição ou validação no histórico da loja (o recálculo automático
  // do preenchimento mexe em updated_at e não conta).
  outdated: Prisma.sql`status <> 'INACTIVE' AND greatest(
                 coalesce((SELECT max(h.created_at) FROM store_history h
                            WHERE h.store_id = stores.id AND h.kind IN ('EDIT', 'VALIDATION')),
                          stores.created_at),
                 coalesce(stores.validated_at, stores.created_at))
               < now() - interval '${Prisma.raw(String(OUTDATED_DAYS))} days'`,
  doc: Prisma.sql`EXISTS (SELECT 1 FROM store_documents d WHERE d.store_id = stores.id
                  AND d.superseded_at IS NULL AND d.request_id IS NULL
                  AND d.valid_until < now() + interval '${Prisma.raw(String(ALERT_DAYS))} days')`,
};

// Valores do mesmo campo somam (ou).
const anyOf = (parts: Prisma.Sql[]) =>
  Prisma.sql`(${Prisma.join(
    parts.map((part) => Prisma.sql`(${part})`),
    ' OR ',
  )})`;

const governanceIds = async (tx: Tx, filter: StoreFilter): Promise<string[] | null> => {
  const parts: Prisma.Sql[] = [];
  if (filter.completeness) parts.push(anyOf(filter.completeness.map((v) => COMPLETENESS_SQL[v]!)));
  if (filter.validation) parts.push(anyOf(filter.validation.map((v) => VALIDATION_SQL[v]!)));
  if (filter.alert) parts.push(anyOf(filter.alert.map((v) => ALERT_SQL[v])));
  // Atalhos antigos (links da Visão geral): cada um é um "e".
  if (filter.hasOpenRequest) parts.push(ALERT_SQL.request);
  if (filter.outdated) parts.push(ALERT_SQL.outdated);
  if (filter.docAlert) parts.push(ALERT_SQL.doc);
  if (parts.length === 0) return null;
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM stores WHERE deleted_at IS NULL AND ${Prisma.join(parts, ' AND ')}`;
  return rows.map((row) => row.id);
};

const requireOne = async (tx: Tx, id: string): Promise<StoreRecord> =>
  toRecord(await tx.store.findUniqueOrThrow({ where: { id }, select: storeSelect() }));

const historyOf = (
  actor: PlatformIdentity,
  storeId: string,
  economicGroupId: string,
  audit: AuditEntry,
  change: StoreHistoryChange,
) => ({
  storeId,
  economicGroupId,
  kind: 'EDIT' as const,
  fieldLabel: change.fieldLabel,
  oldValue: change.oldValue,
  newValue: change.newValue,
  justification: audit.justification ?? null,
  actorKind: 'PLATFORM' as const,
  actorSubject: actor.subject,
  actorRole: actor.role,
});

export const storesRepository: StoresRepository = {
  list(actor, filter, page, pageSize, options = {}) {
    return withActor(actor, async (tx) => {
      const where = whereOf(filter);
      const ids = await governanceIds(tx, filter);
      if (ids) where.id = { in: ids };
      const rows = await tx.store.findMany({
        where,
        select: storeSelect(),
        orderBy: [{ economicGroup: { number: 'asc' } }, { code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      const total = await tx.store.count({ where });
      // A exportação não precisa da lista de campos que faltam (é a conta mais cara).
      const missing =
        options.withMissing === false
          ? new Map<string, string[]>()
          : await missingFieldsByStore(
              tx,
              rows.map((row) => row.id),
            );
      return {
        data: rows.map((row) => {
          const record = toRecord(row);
          return {
            ...record,
            completeness: { ...record.completeness, missing: missing.get(row.id) ?? [] },
          };
        }),
        total,
      };
    });
  },

  stats(actor) {
    return withActor(actor, async (tx) => {
      const rows = await tx.$queryRaw<
        {
          total: number;
          pdv: number;
          cd: number;
          active: number;
          pending: number;
          inactive: number;
          groups: number;
          avg_completeness: number | null;
          complete: number;
          partial: number;
          low: number;
          validation_attention: number;
          outdated: number;
          active_unblocked: number;
        }[]
      >`
        SELECT count(*)::int AS total,
               (count(*) FILTER (WHERE type = 'PDV'))::int AS pdv,
               (count(*) FILTER (WHERE type = 'CD'))::int AS cd,
               (count(*) FILTER (WHERE status = 'ACTIVE'))::int AS active,
               (count(*) FILTER (WHERE status = 'PENDING'))::int AS pending,
               (count(*) FILTER (WHERE status = 'INACTIVE'))::int AS inactive,
               count(DISTINCT economic_group_id)::int AS groups,
               -- Loja ainda sem cálculo conta como 0%, igual ao filtro "falta muito".
               round(avg(CASE WHEN completeness_total = 0 THEN 0
                              ELSE completeness_filled * 100.0 / completeness_total END))::int
                 AS avg_completeness,
               (count(*) FILTER (WHERE ${COMPLETENESS_SQL.complete!}))::int AS complete,
               (count(*) FILTER (WHERE ${COMPLETENESS_SQL.partial!}))::int AS partial,
               (count(*) FILTER (WHERE ${COMPLETENESS_SQL.low!}))::int AS low,
               (count(*) FILTER (WHERE ${VALIDATION_SQL.attention!}))::int AS validation_attention,
               (count(*) FILTER (WHERE ${ALERT_SQL.outdated}))::int AS outdated,
               (count(*) FILTER (WHERE status = 'ACTIVE' AND blocked_at IS NULL))::int AS active_unblocked
          FROM stores
         WHERE deleted_at IS NULL`;
      const alerts = await tx.$queryRaw<
        { docs: number; doc_stores: number; requests: number; request_stores: number }[]
      >`
        SELECT (SELECT count(*) FROM store_documents d
                  JOIN stores s ON s.id = d.store_id AND s.deleted_at IS NULL
                 WHERE d.superseded_at IS NULL AND d.request_id IS NULL
                   AND d.valid_until < now() + interval '30 days')::int AS docs,
               (SELECT count(DISTINCT d.store_id) FROM store_documents d
                  JOIN stores s ON s.id = d.store_id AND s.deleted_at IS NULL
                 WHERE d.superseded_at IS NULL AND d.request_id IS NULL
                   AND d.valid_until < now() + interval '30 days')::int AS doc_stores,
               (SELECT count(*) FROM store_change_requests r
                  JOIN stores s ON s.id = r.store_id AND s.deleted_at IS NULL
                 WHERE r.status = 'OPEN')::int AS requests,
               (SELECT count(DISTINCT r.store_id) FROM store_change_requests r
                  JOIN stores s ON s.id = r.store_id AND s.deleted_at IS NULL
                 WHERE r.status = 'OPEN')::int AS request_stores`;
      const row = rows[0];
      const alert = alerts[0];
      return {
        total: row?.total ?? 0,
        pdv: row?.pdv ?? 0,
        cd: row?.cd ?? 0,
        active: row?.active ?? 0,
        pending: row?.pending ?? 0,
        inactive: row?.inactive ?? 0,
        groups: row?.groups ?? 0,
        avgCompleteness: row?.avg_completeness ?? 0,
        completenessBands: {
          complete: row?.complete ?? 0,
          partial: row?.partial ?? 0,
          low: row?.low ?? 0,
        },
        validationAttention: row?.validation_attention ?? 0,
        outdated: row?.outdated ?? 0,
        activeUnblocked: row?.active_unblocked ?? 0,
        docAlerts: { docs: alert?.docs ?? 0, stores: alert?.doc_stores ?? 0 },
        openRequests: { requests: alert?.requests ?? 0, stores: alert?.request_stores ?? 0 },
      };
    });
  },

  findById(actor, id) {
    return withActor(actor, async (tx) => {
      const row = await tx.store.findFirst({
        where: { id, deletedAt: null },
        select: storeSelect(),
      });
      return row ? toRecord(row) : null;
    });
  },

  findGroup(actor, number) {
    return withActor(actor, (tx) =>
      tx.economicGroup.findFirst({
        where: { number, deletedAt: null },
        select: { id: true, status: true },
      }),
    );
  },

  findBrand(actor, id) {
    return withActor(actor, (tx) =>
      tx.brand.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } }),
    );
  },

  isCnpjTaken(actor, cnpj) {
    return withActor(actor, async (tx) => {
      const found = await tx.store.findFirst({
        where: { cnpj, deletedAt: null },
        select: { id: true },
      });
      return found !== null;
    });
  },

  create(actor, groupId, input, audit) {
    return withActor(actor, async (tx) => {
      const { openedAt, ...fields } = input;
      const created = await tx.store.create({
        data: {
          ...fields,
          economicGroupId: groupId,
          ...(openedAt ? { openedAt: new Date(`${openedAt}T00:00:00.000Z`) } : {}),
        },
        select: { id: true, code: true },
      });
      await recordAudit(tx, actor, audit(created.code));
      await refreshCompleteness(tx, created.id);
      return requireOne(tx, created.id);
    });
  },

  findByCode(actor, code) {
    return withActor(actor, async (tx) => {
      const row = await tx.store.findFirst({
        where: { code, deletedAt: null },
        select: storeSelect(),
      });
      return row ? toRecord(row) : null;
    });
  },

  updateStage(actor, id, data, audit, history) {
    return withActor(actor, async (tx) => {
      const store = await tx.store.update({
        where: { id },
        data: {
          stage: data.stage,
          ...(data.openedAt ? { openedAt: new Date(`${data.openedAt}T00:00:00.000Z`) } : {}),
        },
        select: { economicGroupId: true },
      });
      await recordAudit(tx, actor, audit);
      await addHistory(tx, [historyOf(actor, id, store.economicGroupId, audit, history)]);
      return requireOne(tx, id);
    });
  },

  count(actor, filter) {
    return withActor(actor, async (tx) => {
      const where = whereOf(filter);
      const ids = await governanceIds(tx, filter);
      if (ids) where.id = { in: ids };
      return tx.store.count({ where });
    });
  },

  facetValues(actor, field) {
    return withActor(actor, async (tx) => {
      switch (field) {
        case 'brandId': {
          const rows = await tx.store.findMany({
            where: { deletedAt: null },
            distinct: ['brandId'],
            select: { brandId: true },
          });
          return rows.map((row) => row.brandId);
        }
        case 'uf': {
          const rows = await tx.store.findMany({
            where: { deletedAt: null },
            distinct: ['uf'],
            select: { uf: true },
            orderBy: { uf: 'asc' },
          });
          return rows.map((row) => row.uf);
        }
        case 'angelId': {
          const groups = await tx.economicGroup.findMany({
            where: { deletedAt: null, stores: { some: { deletedAt: null } } },
            distinct: ['angelEmployeeId'],
            select: { angelEmployeeId: true },
          });
          const ids = groups.flatMap((group) =>
            group.angelEmployeeId ? [group.angelEmployeeId] : [],
          );
          return groups.some((group) => !group.angelEmployeeId) ? [...ids, NO_ANGEL] : ids;
        }
        case 'stage':
          return ['OPENED', 'SETUP', 'PROSPECTING'];
        case 'status':
          return ['ACTIVE', 'PENDING', 'INACTIVE'];
        case 'blocked':
          return ['false', 'true'];
        case 'completeness':
          return ['complete', 'partial', 'low'];
        case 'validation':
          return ['ok', 'due_soon', 'overdue', 'never'];
        case 'alert':
          return [...STORE_ALERTS];
      }
    });
  },

  remindMany(actor, ids) {
    return withActor(actor, async (tx) => {
      for (const id of ids) {
        const store = await tx.store.update({
          where: { id },
          data: { validationRemindedAt: new Date() },
          select: { economicGroupId: true, name: true },
        });
        await addHistory(tx, [
          {
            storeId: id,
            economicGroupId: store.economicGroupId,
            kind: 'REMINDER',
            fieldLabel: 'Cobrança de validação dos dados',
            newValue: 'Enviada ao proprietário',
            actorKind: 'PLATFORM',
            actorSubject: actor.subject,
            actorRole: actor.role,
          },
        ]);
        await recordAudit(tx, actor, {
          economicGroupId: store.economicGroupId,
          action: 'STORE_VALIDATION_REMINDED',
          summary: `Cobrança de preenchimento e validação da loja ${store.name} (em lote)`,
        });
      }
    });
  },

  findByCodes(actor, codes) {
    return withActor(actor, async (tx) => {
      const rows = await tx.store.findMany({
        where: { code: { in: codes }, deletedAt: null },
        select: storeSelect(),
      });
      return rows.map(toRecord);
    });
  },

  // Lote: uma transação, um registro na auditoria do grupo de cada loja (spec 003, FR-071).
  setBlockMany(actor, ids, block, auditOf, history) {
    return withActor(actor, async (tx) => {
      for (const id of ids) {
        const store = await tx.store.update({
          where: { id },
          data: block ?? { blockedAt: null, blockedReason: null, blockedBy: null },
          select: { economicGroupId: true, code: true, name: true },
        });
        const audit = { ...auditOf(store), economicGroupId: store.economicGroupId };
        await recordAudit(tx, actor, audit);
        await addHistory(tx, [historyOf(actor, id, store.economicGroupId, audit, history)]);
      }
    });
  },

  setBlock(actor, id, block, audit, history) {
    return withActor(actor, async (tx) => {
      const store = await tx.store.update({
        where: { id },
        data: block ?? { blockedAt: null, blockedReason: null, blockedBy: null },
        select: { economicGroupId: true },
      });
      await recordAudit(tx, actor, audit);
      await addHistory(tx, [historyOf(actor, id, store.economicGroupId, audit, history)]);
      return requireOne(tx, id);
    });
  },

  updateStatus(actor, id, status, audit) {
    return withActor(actor, async (tx) => {
      await tx.store.update({ where: { id }, data: { status } });
      await recordAudit(tx, actor, audit);
      return requireOne(tx, id);
    });
  },
};
