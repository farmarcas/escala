import { describe, expect, it, vi } from 'vitest';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import type { CreateStoreInput } from './stores.schemas.js';
import {
  formatStoreCode,
  makeStoresService,
  type StoreRecord,
  type StoresRepository,
} from './stores.service.js';

const admin: PlatformIdentity = { kind: 'platform', subject: 'OP-02', role: 'PLATFORM_ADMIN' };

const input: CreateStoreInput = {
  name: 'Drogaria Aurora Moema',
  type: 'PDV',
  cnpj: '11222333000181',
  brandId: '0f1dced3-1506-5e07-a94f-835d9898b6ae',
  street: 'Av. Ibirapuera',
  number: '2000',
  district: 'Moema',
  city: 'São Paulo',
  uf: 'SP',
};

const store = (overrides: Partial<StoreRecord> = {}): StoreRecord => ({
  id: 's1',
  code: 92,
  groupNumber: 417,
  groupName: 'Grupo Aurora Norte',
  brand: { id: input.brandId, name: 'Rede Aurora', status: 'ACTIVE' },
  name: input.name,
  type: 'PDV',
  cnpj: input.cnpj,
  street: input.street,
  number: input.number,
  district: input.district,
  zip: null,
  city: input.city,
  uf: 'SP',
  openedAt: null,
  status: 'PENDING',
  createdAt: new Date('2026-10-30T12:00:00.000Z'),
  completeness: { filled: 0, total: 22 },
  validation: { status: 'never', validatedAt: null, days: null },
  docAlerts: 0,
  openRequests: 0,
  ...overrides,
});

const makeRepo = (overrides: Partial<StoresRepository> = {}): StoresRepository => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  stats: vi.fn(),
  findById: vi.fn().mockResolvedValue(store()),
  findGroup: vi.fn().mockResolvedValue({ id: 'g1', status: 'ACTIVE' }),
  findBrand: vi.fn().mockResolvedValue({ id: input.brandId, status: 'ACTIVE' }),
  isCnpjTaken: vi.fn().mockResolvedValue(false),
  create: vi.fn().mockResolvedValue(store()),
  updateStatus: vi.fn().mockResolvedValue(store({ status: 'ACTIVE' })),
  ...overrides,
});

describe('stores service · create', () => {
  it('deve cadastrar no grupo e auditar com o código da loja', async () => {
    const repo = makeRepo();

    await makeStoresService(repo).create(admin, 417, input);

    const call = vi.mocked(repo.create).mock.calls[0];
    expect(call?.[1]).toBe('g1');
    expect(call?.[3](92)).toMatchObject({
      economicGroupId: 'g1',
      action: 'STORE_CREATED',
      summary: 'Loja LJ-092 · Drogaria Aurora Moema cadastrada',
    });
  });

  it('deve recusar marca histórica', async () => {
    const repo = makeRepo({
      findBrand: vi.fn().mockResolvedValue({ id: input.brandId, status: 'HISTORICAL' }),
    });

    await expect(makeStoresService(repo).create(admin, 417, input)).rejects.toMatchObject({
      code: 'BRAND_INACTIVE',
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('deve recusar CNPJ já cadastrado', async () => {
    const repo = makeRepo({ isCnpjTaken: vi.fn().mockResolvedValue(true) });

    await expect(makeStoresService(repo).create(admin, 417, input)).rejects.toMatchObject({
      code: 'STORE_CNPJ_TAKEN',
    });
  });

  it('deve recusar loja nova em grupo arquivado', async () => {
    const repo = makeRepo({
      findGroup: vi.fn().mockResolvedValue({ id: 'g1', status: 'ARCHIVED' }),
    });

    await expect(makeStoresService(repo).create(admin, 417, input)).rejects.toMatchObject({
      code: 'GROUP_ARCHIVED',
    });
  });

  it('deve responder 404 quando o grupo não existe', async () => {
    const repo = makeRepo({ findGroup: vi.fn().mockResolvedValue(null) });

    await expect(makeStoresService(repo).create(admin, 9999, input)).rejects.toMatchObject({
      code: 'GROUP_NOT_FOUND',
    });
  });
});

describe('stores service · updateStatus', () => {
  it('deve auditar a ativação no grupo da loja', async () => {
    const repo = makeRepo();

    await makeStoresService(repo).updateStatus(admin, 's1', { status: 'ACTIVE' });

    expect(repo.updateStatus).toHaveBeenCalledWith(
      admin,
      's1',
      'ACTIVE',
      expect.objectContaining({ economicGroupId: 'g1', action: 'STORE_ACTIVATED' }),
    );
  });

  it('não deve gravar quando o status já é o pedido', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(store({ status: 'ACTIVE' })) });

    await makeStoresService(repo).updateStatus(admin, 's1', { status: 'ACTIVE' });

    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});

describe('formatStoreCode', () => {
  it('deve formatar com 3 dígitos', () => {
    expect(formatStoreCode(7)).toBe('LJ-007');
    expect(formatStoreCode(1204)).toBe('LJ-1204');
  });
});
