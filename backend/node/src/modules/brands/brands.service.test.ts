import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../shared/errors/conflict-error.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import { makeBrandsService, type BrandRecord, type BrandsRepository } from './brands.service.js';

const admin: PlatformIdentity = { kind: 'platform', subject: 'OP-02', role: 'PLATFORM_ADMIN' };

const brand = (overrides: Partial<BrandRecord> = {}): BrandRecord => ({
  id: 'b1',
  name: 'Vida Leve',
  status: 'ACTIVE',
  storeCount: 0,
  groupCount: 0,
  createdAt: new Date('2026-09-10T00:00:00.000Z'),
  ...overrides,
});

const makeRepo = (overrides: Partial<BrandsRepository> = {}): BrandsRepository => ({
  list: vi.fn(),
  stats: vi.fn(),
  findById: vi.fn().mockResolvedValue(brand()),
  findIdByNormalizedName: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue(brand()),
  update: vi.fn().mockResolvedValue(brand()),
  softDelete: vi.fn(),
  ...overrides,
});

describe('brands service · create', () => {
  it('deve recusar nome repetido ignorando maiúsculas e acentos', async () => {
    const repo = makeRepo({ findIdByNormalizedName: vi.fn().mockResolvedValue('outra') });
    const service = makeBrandsService(repo);

    const promise = service.create(admin, { name: 'MAIS SAUDE' });

    await expect(promise).rejects.toBeInstanceOf(ConflictError);
    await expect(promise).rejects.toMatchObject({ code: 'BRAND_NAME_TAKEN' });
    expect(repo.findIdByNormalizedName).toHaveBeenCalledWith(admin, 'mais saude');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('deve criar com nome normalizado e registrar auditoria', async () => {
    const repo = makeRepo();
    const service = makeBrandsService(repo);

    await service.create(admin, { name: 'Vida Leve' });

    expect(repo.create).toHaveBeenCalledWith(
      admin,
      { name: 'Vida Leve', normalizedName: 'vida leve' },
      expect.objectContaining({ action: 'BRAND_CREATED', economicGroupId: null }),
    );
  });
});

describe('brands service · update', () => {
  it('deve responder 404 quando a marca não existe', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });

    await expect(
      makeBrandsService(repo).update(admin, 'x', { name: 'Nova' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deve permitir renomear mantendo o mesmo nome normalizado da própria marca', async () => {
    const repo = makeRepo({ findIdByNormalizedName: vi.fn().mockResolvedValue('b1') });

    await makeBrandsService(repo).update(admin, 'b1', { name: 'VIDA LEVE' });

    expect(repo.update).toHaveBeenCalled();
  });

  it('deve registrar desativação na auditoria', async () => {
    const repo = makeRepo();

    await makeBrandsService(repo).update(admin, 'b1', { status: 'HISTORICAL' });

    expect(repo.update).toHaveBeenCalledWith(
      admin,
      'b1',
      { status: 'HISTORICAL' },
      expect.objectContaining({ action: 'BRAND_DEACTIVATED' }),
    );
  });
});

describe('brands service · remove', () => {
  it('deve recusar excluir marca com lojas', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(brand({ storeCount: 3 })) });

    await expect(makeBrandsService(repo).remove(admin, 'b1')).rejects.toMatchObject({
      code: 'BRAND_HAS_STORES',
    });
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('deve excluir marca sem lojas', async () => {
    const repo = makeRepo();

    await makeBrandsService(repo).remove(admin, 'b1');

    expect(repo.softDelete).toHaveBeenCalledWith(
      admin,
      'b1',
      expect.objectContaining({ action: 'BRAND_DELETED' }),
    );
  });
});
