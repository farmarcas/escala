import { normalizeName } from '../../shared/br/normalize-name.js';
import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import type { AuditEntry } from '../audit/audit.types.js';
import type { BrandStatusValue, CreateBrandInput, UpdateBrandInput } from './brands.schemas.js';

export type BrandRecord = {
  id: string;
  name: string;
  status: BrandStatusValue;
  storeCount: number;
  groupCount: number;
  createdAt: Date;
};

export type BrandStats = { active: number; historical: number; withoutStores: number };

export type BrandWrite = { name?: string; normalizedName?: string; status?: BrandStatusValue };

export type BrandsRepository = {
  list: (
    actor: PlatformIdentity,
    filter: { status?: BrandStatusValue },
    page: number,
    pageSize: number,
  ) => Promise<{ data: BrandRecord[]; total: number }>;
  stats: (actor: PlatformIdentity) => Promise<BrandStats>;
  findById: (actor: PlatformIdentity, id: string) => Promise<BrandRecord | null>;
  findIdByNormalizedName: (actor: PlatformIdentity, normalized: string) => Promise<string | null>;
  create: (
    actor: PlatformIdentity,
    input: { name: string; normalizedName: string },
    audit: AuditEntry,
  ) => Promise<BrandRecord>;
  update: (
    actor: PlatformIdentity,
    id: string,
    input: BrandWrite,
    audit: AuditEntry,
  ) => Promise<BrandRecord>;
  softDelete: (actor: PlatformIdentity, id: string, audit: AuditEntry) => Promise<void>;
};

const notFound = () => new NotFoundError('Marca não encontrada', 'BRAND_NOT_FOUND');
const nameTaken = () => new ConflictError('Já existe uma marca com esse nome', 'BRAND_NAME_TAKEN');

const statusAudit = (name: string, status: BrandStatusValue): AuditEntry =>
  status === 'HISTORICAL'
    ? { economicGroupId: null, action: 'BRAND_DEACTIVATED', summary: `Marca ${name} desativada` }
    : { economicGroupId: null, action: 'BRAND_REACTIVATED', summary: `Marca ${name} reativada` };

export const makeBrandsService = (repo: BrandsRepository) => ({
  async list(
    actor: PlatformIdentity,
    filter: { status?: BrandStatusValue },
    page: number,
    pageSize: number,
  ) {
    const { data, total } = await repo.list(actor, filter, page, pageSize);
    return { data, meta: { page, pageSize, total } };
  },

  stats(actor: PlatformIdentity) {
    return repo.stats(actor);
  },

  async create(actor: PlatformIdentity, input: CreateBrandInput) {
    const normalizedName = normalizeName(input.name);
    if (await repo.findIdByNormalizedName(actor, normalizedName)) throw nameTaken();

    return repo.create(
      actor,
      { name: input.name, normalizedName },
      { economicGroupId: null, action: 'BRAND_CREATED', summary: `Marca ${input.name} cadastrada` },
    );
  },

  async update(actor: PlatformIdentity, id: string, input: UpdateBrandInput) {
    const current = await repo.findById(actor, id);
    if (!current) throw notFound();

    const write: BrandWrite = {};
    let audit: AuditEntry | null = null;

    if (input.name !== undefined && input.name !== current.name) {
      const normalizedName = normalizeName(input.name);
      const owner = await repo.findIdByNormalizedName(actor, normalizedName);
      if (owner && owner !== id) throw nameTaken();
      write.name = input.name;
      write.normalizedName = normalizedName;
      audit = {
        economicGroupId: null,
        action: 'BRAND_RENAMED',
        summary: `Marca ${current.name} renomeada para ${input.name}`,
      };
    }

    if (input.status !== undefined && input.status !== current.status) {
      write.status = input.status;
      audit = statusAudit(input.name ?? current.name, input.status);
    }

    if (!audit) return current;
    return repo.update(actor, id, write, audit);
  },

  async remove(actor: PlatformIdentity, id: string) {
    const current = await repo.findById(actor, id);
    if (!current) throw notFound();
    if (current.storeCount > 0) {
      throw new ConflictError(
        'Marcas com lojas vinculadas não podem ser excluídas, apenas desativadas',
        'BRAND_HAS_STORES',
      );
    }

    await repo.softDelete(actor, id, {
      economicGroupId: null,
      action: 'BRAND_DELETED',
      summary: `Marca ${current.name} excluída`,
    });
  },
});

export type BrandsService = ReturnType<typeof makeBrandsService>;
