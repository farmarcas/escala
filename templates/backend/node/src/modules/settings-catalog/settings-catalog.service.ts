import { Prisma } from '../../generated/prisma/client.js';
import { normalizeName } from '../../shared/br/normalize-name.js';
import { withActor, type Tx } from '../../shared/database/with-actor.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import { listAuditByEntities, recordAudit } from '../audit/audit.repository.js';
import { changesText } from './audit-summary.js';
import {
  CATALOG_LISTS,
  defaultSelfService,
  listOfSlug,
  type CatalogSlug,
} from './catalog-kinds.js';
import { moveInOrder } from './move.js';
import { settingsCatalogRepository as repo, type ItemRow } from './settings-catalog.repository.js';
import {
  createSchemaFor,
  updateSchemaFor,
  type CatalogItemInput,
} from './settings-catalog.schemas.js';

export type CatalogItemView = Omit<ItemRow, 'kind' | 'sort'> & {
  position: number;
  storesInUse: number;
};

type Status = 'active' | 'inactive' | 'all';

const notFound = () => new NotFoundError('Item não encontrado', 'CATALOG_ITEM_NOT_FOUND');
const versionConflict = () =>
  new ConflictError(
    'Este item foi alterado por outra pessoa. Recarregue para ver a versão atual.',
    'VERSION_CONFLICT',
  );
const duplicateName = (existing: string) =>
  new AppError(`Já existe "${existing}" nesta lista`, 409, 'DUPLICATE_NAME', [{ existing }]);

// Listas com operadora ou categoria sugerem os valores já usados.
const SUGGESTS_GROUP: CatalogSlug[] = ['pbms', 'external-tools'];

const toView = (rows: ItemRow[], inUse: Map<string, number>): CatalogItemView[] =>
  rows.map(({ kind: _kind, sort: _sort, ...row }, index) => ({
    ...row,
    position: index + 1,
    storesInUse: inUse.get(row.id) ?? 0,
  }));

const matches = (row: ItemRow, status: Status, q: string | undefined) => {
  if (status === 'active' && !row.active) return false;
  if (status === 'inactive' && row.active) return false;
  if (!q) return true;
  const term = normalizeName(q);
  return [row.name, row.groupLabel ?? ''].some((text) => normalizeName(text).includes(term));
};

const audit = (id: string, action: string, summary: string) => ({
  economicGroupId: null,
  entity: { type: 'CATALOG_ITEM' as const, id },
  action,
  summary,
});

const actorOf = (identity: PlatformIdentity) => ({
  subject: identity.subject,
  role: identity.role,
});

const ensureUniqueName = (rows: ItemRow[], name: string, exceptId?: string) => {
  const key = normalizeName(name);
  const clash = rows.find((row) => row.id !== exceptId && normalizeName(row.name) === key);
  if (clash) throw duplicateName(clash.name);
};

const loadView = async (tx: Tx, slug: CatalogSlug, id: string): Promise<CatalogItemView> => {
  const rows = await repo.items(tx, listOfSlug(slug).kind);
  const view = toView(rows, await repo.storesInUse(tx, [id])).find((item) => item.id === id);
  if (!view) throw notFound();
  return view;
};

const requireItem = async (tx: Tx, slug: CatalogSlug, id: string, version: number) => {
  const item = await repo.find(tx, listOfSlug(slug).kind, id);
  if (!item) throw notFound();
  if (item.version !== version) throw versionConflict();
  return item;
};

// Corrida de dois nomes iguais ao mesmo tempo: o índice único do banco segura.
const rethrowDuplicate = (error: unknown, name: string): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw duplicateName(name);
  throw error;
};

const snapshot = (row: ItemRow) => ({
  name: row.name,
  groupLabel: row.groupLabel,
  description: row.description,
  icon: row.icon,
  selfService: row.selfService,
  usedByScale: row.usedByScale,
  negotiatedMonthlyCents: row.negotiatedMonthlyCents,
});

// Configurações → Atributos da loja (specs/004). Só o administrador chega aqui (rotas).
export const settingsCatalogService = {
  summary(identity: PlatformIdentity) {
    return withActor(identity, async (tx) => {
      const counts = await repo.counts(tx);
      const count = (kind: string, active: boolean) =>
        counts.find((row) => row.kind === kind && row.active === active)?._count._all ?? 0;
      return {
        data: CATALOG_LISTS.map((list) => ({
          kind: list.slug,
          label: list.label,
          active: count(list.kind, true),
          inactive: count(list.kind, false),
        })),
      };
    });
  },

  list(identity: PlatformIdentity, slug: CatalogSlug, status: Status, q?: string) {
    return withActor(identity, async (tx) => {
      const rows = await repo.items(tx, listOfSlug(slug).kind);
      const inUse = await repo.storesInUse(
        tx,
        rows.map((row) => row.id),
      );
      const suggestions = SUGGESTS_GROUP.includes(slug)
        ? [...new Set(rows.flatMap((row) => (row.groupLabel ? [row.groupLabel] : [])))].sort(
            (a, b) => a.localeCompare(b, 'pt-BR'),
          )
        : [];
      return {
        data: toView(rows, inUse).filter((_, index) => matches(rows[index]!, status, q)),
        meta: { suggestions },
      };
    });
  },

  create(identity: PlatformIdentity, slug: CatalogSlug, body: unknown) {
    const input: CatalogItemInput = createSchemaFor(slug).parse(body);
    const list = listOfSlug(slug);
    return withActor(identity, async (tx) => {
      ensureUniqueName(await repo.items(tx, list.kind), input.name);
      const created = await tx.catalogItem
        .create({
          data: {
            kind: list.kind,
            ...input,
            selfService:
              input.selfService ??
              (slug === 'furniture' && defaultSelfService(input.groupLabel ?? '')),
            sort: await repo.nextSort(tx, list.kind),
          },
          select: { id: true },
        })
        .catch((error: unknown) => rethrowDuplicate(error, input.name));
      await recordAudit(
        tx,
        actorOf(identity),
        audit(created.id, 'CATALOG_ITEM_CREATED', `${list.label} · ${input.name}: incluído`),
      );
      return loadView(tx, slug, created.id);
    });
  },

  update(identity: PlatformIdentity, slug: CatalogSlug, id: string, body: { version: number }) {
    const { version, ...fields } = body;
    const input = updateSchemaFor(slug).parse(fields);
    const list = listOfSlug(slug);
    return withActor(identity, async (tx) => {
      const item = await requireItem(tx, slug, id, version);
      if (input.name !== undefined)
        ensureUniqueName(await repo.items(tx, list.kind), input.name, id);
      const summary = changesText(list.label, snapshot(item), { ...snapshot(item), ...input });
      if (!summary) return loadView(tx, slug, id);
      const saved = await repo
        .updateVersioned(tx, id, version, input)
        .catch((error: unknown) => rethrowDuplicate(error, input.name ?? item.name));
      if (!saved) throw versionConflict();
      await recordAudit(tx, actorOf(identity), audit(id, 'CATALOG_ITEM_UPDATED', summary));
      return loadView(tx, slug, id);
    });
  },

  move(
    identity: PlatformIdentity,
    slug: CatalogSlug,
    id: string,
    body: { version: number; direction: 'up' | 'down' },
  ) {
    const list = listOfSlug(slug);
    return withActor(identity, async (tx) => {
      const item = await requireItem(tx, slug, id, body.version);
      const rows = await repo.items(tx, list.kind);
      const before = rows.map((row) => row.id);
      // Ativo troca com ativo e desativado com desativado: é o vizinho que aparece na tela.
      const sameStatus = new Set(
        rows.filter((row) => row.active === item.active).map((row) => row.id),
      );
      const after = moveInOrder(before, id, body.direction, (other) => sameStatus.has(other));
      if (after !== before) {
        // Renumera a lista inteira: os seeds antigos podem ter ordens repetidas.
        for (const [sort, rowId] of after.entries()) {
          const row = rows.find((candidate) => candidate.id === rowId)!;
          if (rowId === id) {
            if (!(await repo.updateVersioned(tx, id, body.version, { sort })))
              throw versionConflict();
          } else if (row.sort !== sort) {
            await tx.catalogItem.update({ where: { id: rowId }, data: { sort } });
          }
        }
        const position = after.indexOf(id) + 1;
        await recordAudit(
          tx,
          actorOf(identity),
          audit(
            id,
            'CATALOG_ITEM_MOVED',
            `${list.label} · ${item.name}: ${body.direction === 'up' ? 'subiu' : 'desceu'} para a posição ${position}`,
          ),
        );
      }
      const fresh = await repo.items(tx, list.kind);
      return {
        data: toView(
          fresh,
          await repo.storesInUse(
            tx,
            fresh.map((row) => row.id),
          ),
        ),
      };
    });
  },

  setStatus(
    identity: PlatformIdentity,
    slug: CatalogSlug,
    id: string,
    body: { version: number; active: boolean },
  ) {
    const list = listOfSlug(slug);
    return withActor(identity, async (tx) => {
      const item = await requireItem(tx, slug, id, body.version);
      if (item.active !== body.active) {
        if (!(await repo.updateVersioned(tx, id, body.version, { active: body.active })))
          throw versionConflict();
        await recordAudit(
          tx,
          actorOf(identity),
          audit(
            id,
            body.active ? 'CATALOG_ITEM_REACTIVATED' : 'CATALOG_ITEM_DEACTIVATED',
            `${list.label} · ${item.name}: ${body.active ? 'reativado' : 'desativado'}`,
          ),
        );
      }
      return loadView(tx, slug, id);
    });
  },

  // Exclusão lógica, só sem uso: o histórico das lojas guarda o nome como texto.
  remove(identity: PlatformIdentity, slug: CatalogSlug, id: string, version: number) {
    const list = listOfSlug(slug);
    return withActor(identity, async (tx) => {
      const item = await requireItem(tx, slug, id, version);
      const stores = (await repo.storesInUse(tx, [id])).get(id) ?? 0;
      if (stores > 0) {
        throw new AppError(
          `Em uso por ${stores} ${stores === 1 ? 'loja' : 'lojas'}. Desative em vez de excluir.`,
          409,
          'IN_USE',
          [{ stores }],
        );
      }
      if (!(await repo.updateVersioned(tx, id, version, { deletedAt: new Date() })))
        throw versionConflict();
      await recordAudit(
        tx,
        actorOf(identity),
        audit(id, 'CATALOG_ITEM_DELETED', `${list.label} · ${item.name}: excluído`),
      );
    });
  },

  listAudit(identity: PlatformIdentity, slug: CatalogSlug, page: number, pageSize: number) {
    return withActor(identity, async (tx) => {
      const ids = await repo.allIds(tx, listOfSlug(slug).kind);
      const { data, total } = await listAuditByEntities(tx, 'CATALOG_ITEM', ids, page, pageSize);
      return { data, meta: { page, pageSize, total } };
    });
  },
};
