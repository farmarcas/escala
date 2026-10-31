import { describe, expect, it, vi } from 'vitest';
import { PSEUDONYM_PATTERN } from '../../shared/br/pseudonym.js';
import type { PlatformIdentity } from '../../shared/identity/identity.js';
import {
  makeEconomicGroupsService,
  type EconomicGroupsRepository,
  type GroupDetailRecord,
} from './economic-groups.service.js';

const admin: PlatformIdentity = { kind: 'platform', subject: 'OP-02', role: 'PLATFORM_ADMIN' };
const analyst: PlatformIdentity = { kind: 'platform', subject: 'OP-07', role: 'PLATFORM_ANALYST' };

const juliana = {
  id: 'e1',
  name: 'Juliana Prado',
  jobTitle: 'Analista de relacionamento',
  email: 'juliana.prado@farmarcas.com.br',
  phone: null,
};

const group = (overrides: Partial<GroupDetailRecord> = {}): GroupDetailRecord => ({
  id: 'g1',
  number: 417,
  name: 'Grupo Aurora Norte',
  legalName: 'Aurora Norte Comércio de Medicamentos Ltda',
  status: 'ACTIVE',
  owner: {
    name: 'Carla Mendonça',
    email: 'carla.mendonca@exemplo.com.br',
    phone: '11900004410',
    pseudonym: 'F-1A0PR',
  },
  angel: juliana,
  storeCount: 8,
  pdvCount: 6,
  cdCount: 2,
  brands: ['Rede Aurora', 'Vitta Popular'],
  ufs: ['MG', 'PR', 'SP'],
  outdatedStores: 0,
  cnpj: '41583276000100',
  benefitCard: null,
  activeStores: 7,
  inactiveStores: 1,
  pendingStores: 0,
  brandsBreakdown: [],
  ufsBreakdown: [],
  createdAt: new Date('2026-07-31T12:00:00.000Z'),
  updatedAt: new Date('2026-07-31T12:00:00.000Z'),
  ...overrides,
});

const makeRepo = (overrides: Partial<EconomicGroupsRepository> = {}): EconomicGroupsRepository => ({
  list: vi.fn().mockResolvedValue({ data: [group()], total: 1 }),
  stats: vi.fn(),
  findByNumber: vi.fn().mockResolvedValue(group()),
  create: vi.fn().mockResolvedValue(group()),
  update: vi.fn().mockResolvedValue(group()),
  changeStatus: vi.fn().mockResolvedValue(group()),
  recordAuditOnce: vi.fn(),
  listAudit: vi.fn(),
  findAngelCandidate: vi
    .fn()
    .mockResolvedValue({ id: 'e2', name: 'Isabela Nunes', status: 'ACTIVE' }),
  findAngelTargets: vi.fn().mockResolvedValue([]),
  assignAngels: vi.fn(),
  transferOwner: vi.fn().mockResolvedValue(group()),
  findStoreInGroup: vi.fn().mockResolvedValue({ id: 's1', status: 'ACTIVE' }),
  saveBenefitCard: vi.fn().mockResolvedValue(group()),
  ...overrides,
});

describe('economic groups · pseudonimização', () => {
  it('deve entregar ao analista só o código do proprietário', async () => {
    const service = makeEconomicGroupsService(makeRepo());

    const detail = await service.get(analyst, 417);
    const list = await service.list(analyst, { page: 1, pageSize: 20 });

    expect(detail.owner).toEqual({ pseudonym: 'F-1A0PR' });
    expect(list.data[0]?.owner).toEqual({ pseudonym: 'F-1A0PR' });
    expect(JSON.stringify([detail, list])).not.toMatch(/Carla|carla|11900004410/);
  });

  it('deve entregar ao administrador os dados do proprietário e auditar a consulta', async () => {
    const repo = makeRepo();

    const detail = await makeEconomicGroupsService(repo).get(admin, 417);

    expect(detail.owner).toMatchObject({ name: 'Carla Mendonça', pseudonym: 'F-1A0PR' });
    expect(repo.recordAuditOnce).toHaveBeenCalledWith(
      admin,
      'g1',
      expect.objectContaining({ action: 'OWNER_VIEWED' }),
      30,
    );
  });

  it('não deve auditar consulta do analista', async () => {
    const repo = makeRepo();

    await makeEconomicGroupsService(repo).get(analyst, 417);

    expect(repo.recordAuditOnce).not.toHaveBeenCalled();
  });

  it('deve impedir o analista de buscar pelo nome do proprietário', async () => {
    const repo = makeRepo();

    await makeEconomicGroupsService(repo).list(analyst, { page: 1, pageSize: 20, search: 'Carla' });

    expect(repo.list).toHaveBeenCalledWith(
      analyst,
      expect.objectContaining({ searchOwnerName: false }),
      1,
      20,
    );
  });

  it('deve marcar o selo NO_OWNER quando o grupo não tem proprietário', async () => {
    const repo = makeRepo({ findByNumber: vi.fn().mockResolvedValue(group({ owner: null })) });

    const detail = await makeEconomicGroupsService(repo).get(admin, 66);

    expect(detail.owner).toBeNull();
    expect(detail.badges).toEqual(['NO_OWNER']);
  });

  it('deve marcar o selo OUTDATED_STORES quando há loja sem revisão há mais de 180 dias', async () => {
    const repo = makeRepo({
      findByNumber: vi.fn().mockResolvedValue(group({ outdatedStores: 2 })),
    });

    const detail = await makeEconomicGroupsService(repo).get(admin, 417);

    expect(detail.badges).toEqual(['OUTDATED_STORES']);
    expect(detail.outdatedStores).toBe(2);
  });
});

describe('economic groups · create', () => {
  it('deve gerar pseudônimo para o proprietário e auditar', async () => {
    const repo = makeRepo();

    await makeEconomicGroupsService(repo).create(admin, {
      name: 'Grupo Novo',
      legalName: 'Grupo Novo Ltda',
      cnpj: '11222333000181',
      owner: { name: 'Ana Souza', email: 'ana@exemplo.com.br', phone: '11999990000' },
    });

    const call = vi.mocked(repo.create).mock.calls[0];
    expect(call?.[1].owner?.pseudonym).toMatch(PSEUDONYM_PATTERN);
    expect(call?.[2]).toMatchObject({ action: 'GROUP_CREATED' });
  });

  it('deve responder 404 quando o grupo não existe', async () => {
    const repo = makeRepo({ findByNumber: vi.fn().mockResolvedValue(null) });

    await expect(makeEconomicGroupsService(repo).get(admin, 9999)).rejects.toMatchObject({
      code: 'GROUP_NOT_FOUND',
    });
  });
});

describe('economic groups · ciclo de vida', () => {
  const cases = [
    { from: 'ACTIVE', action: 'suspend', to: 'SUSPENDED' },
    { from: 'ACTIVE', action: 'archive', to: 'ARCHIVED' },
    { from: 'SUSPENDED', action: 'archive', to: 'ARCHIVED' },
    { from: 'SUSPENDED', action: 'restore', to: 'ACTIVE' },
    { from: 'ARCHIVED', action: 'restore', to: 'ACTIVE' },
  ] as const;

  it.each(cases)('deve ir de $from para $to com $action', async ({ from, action, to }) => {
    const repo = makeRepo({ findByNumber: vi.fn().mockResolvedValue(group({ status: from })) });

    await makeEconomicGroupsService(repo).changeStatus(admin, 417, {
      action,
      justification: 'Pedido do associado',
    });

    expect(repo.changeStatus).toHaveBeenCalledWith(
      admin,
      'g1',
      to,
      expect.objectContaining({ justification: 'Pedido do associado' }),
    );
  });

  const invalid = [
    { from: 'SUSPENDED', action: 'suspend' },
    { from: 'ARCHIVED', action: 'suspend' },
    { from: 'ARCHIVED', action: 'archive' },
    { from: 'ACTIVE', action: 'restore' },
  ] as const;

  it.each(invalid)('deve recusar $action quando o grupo está $from', async ({ from, action }) => {
    const repo = makeRepo({ findByNumber: vi.fn().mockResolvedValue(group({ status: from })) });

    await expect(
      makeEconomicGroupsService(repo).changeStatus(admin, 417, { action, justification: 'x' }),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
    expect(repo.changeStatus).not.toHaveBeenCalled();
  });
});

describe('economic groups · update', () => {
  it('deve criar pseudônimo quando o grupo ainda não tinha proprietário', async () => {
    const repo = makeRepo({ findByNumber: vi.fn().mockResolvedValue(group({ owner: null })) });

    await makeEconomicGroupsService(repo).update(admin, 66, {
      owner: { name: 'Ana Souza', email: 'ana@exemplo.com.br', phone: '11999990000' },
    });

    const call = vi.mocked(repo.update).mock.calls[0];
    expect(call?.[2].owner?.pseudonym).toMatch(PSEUDONYM_PATTERN);
    expect(call?.[3].summary).toContain('proprietário');
  });

  it('deve recusar trocar o proprietário pela edição quando o grupo já tem um', async () => {
    const repo = makeRepo();

    const result = makeEconomicGroupsService(repo).update(admin, 417, {
      owner: { name: 'Outra Pessoa', email: 'outra@exemplo.com.br', phone: '11900004410' },
    });

    await expect(result).rejects.toMatchObject({ code: 'OWNER_TRANSFER_REQUIRED' });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('economic groups · Anjo', () => {
  it('deve marcar o selo NO_ANGEL em grupo sem Anjo, menos no arquivado', async () => {
    const withoutAngel = makeRepo({
      findByNumber: vi.fn().mockResolvedValue(group({ angel: null })),
    });
    const archived = makeRepo({
      findByNumber: vi.fn().mockResolvedValue(group({ angel: null, status: 'ARCHIVED' })),
    });

    expect((await makeEconomicGroupsService(withoutAngel).get(admin, 417)).badges).toEqual([
      'NO_ANGEL',
    ]);
    expect((await makeEconomicGroupsService(archived).get(admin, 417)).badges).toEqual([]);
  });

  it('deve trocar o Anjo e registrar o anterior e o novo', async () => {
    const repo = makeRepo();

    await makeEconomicGroupsService(repo).setAngel(admin, 417, { employeeId: 'e2' });

    expect(repo.assignAngels).toHaveBeenCalledWith(admin, [
      {
        groupId: 'g1',
        employeeId: 'e2',
        audit: {
          action: 'ANGEL_CHANGED',
          summary: 'Anjo trocado de Juliana Prado para Isabela Nunes',
        },
      },
    ]);
  });

  it('deve retirar o Anjo', async () => {
    const repo = makeRepo();

    await makeEconomicGroupsService(repo).setAngel(admin, 417, { employeeId: null });

    expect(vi.mocked(repo.assignAngels).mock.calls[0]?.[1][0]).toMatchObject({
      employeeId: null,
      audit: { action: 'ANGEL_REMOVED', summary: 'Anjo retirado (era Juliana Prado)' },
    });
  });

  it('não deve gravar nada quando o Anjo escolhido já é o atual', async () => {
    const repo = makeRepo();

    await makeEconomicGroupsService(repo).setAngel(admin, 417, { employeeId: 'e1' });

    expect(repo.assignAngels).not.toHaveBeenCalled();
  });

  it('deve recusar funcionário desligado e grupo arquivado', async () => {
    const terminated = makeRepo({
      findAngelCandidate: vi.fn().mockResolvedValue({ id: 'e2', name: 'X', status: 'TERMINATED' }),
    });
    const archived = makeRepo({
      findByNumber: vi.fn().mockResolvedValue(group({ status: 'ARCHIVED' })),
    });

    await expect(
      makeEconomicGroupsService(terminated).setAngel(admin, 417, { employeeId: 'e2' }),
    ).rejects.toMatchObject({ code: 'EMPLOYEE_NOT_ACTIVE' });
    await expect(
      makeEconomicGroupsService(archived).setAngel(admin, 417, { employeeId: 'e2' }),
    ).rejects.toMatchObject({ code: 'GROUP_ARCHIVED' });
  });

  it('deve atribuir em lote e pular arquivados, não achados e quem já tem esse Anjo', async () => {
    const repo = makeRepo({
      findAngelTargets: vi.fn().mockResolvedValue([
        { id: 'g1', number: 1, status: 'ACTIVE', angel: null },
        { id: 'g2', number: 2, status: 'ARCHIVED', angel: null },
        { id: 'g3', number: 3, status: 'ACTIVE', angel: { id: 'e2', name: 'Isabela Nunes' } },
      ]),
    });

    const result = await makeEconomicGroupsService(repo).bulkAngel(admin, {
      numbers: [1, 2, 3, 4],
      employeeId: 'e2',
    });

    expect(result).toEqual({ changed: 1, skipped: 3 });
    expect(vi.mocked(repo.assignAngels).mock.calls[0]?.[1]).toEqual([
      {
        groupId: 'g1',
        employeeId: 'e2',
        audit: { action: 'ANGEL_ASSIGNED', summary: 'Anjo definido: Isabela Nunes' },
      },
    ]);
  });
});

describe('economic groups · titularidade', () => {
  it('deve transferir com código novo e registrar só os códigos', async () => {
    const repo = makeRepo();

    await makeEconomicGroupsService(repo).transferOwner(admin, 417, {
      name: 'Nova Pessoa',
      email: 'nova@exemplo.com.br',
      phone: '11911112222',
      justification: 'Venda da participação',
    });

    const call = vi.mocked(repo.transferOwner).mock.calls[0];
    const pseudonym = call?.[2].pseudonym ?? '';
    expect(pseudonym).toMatch(PSEUDONYM_PATTERN);
    expect(pseudonym).not.toBe('F-1A0PR');
    expect(call?.[3]).toEqual({
      action: 'OWNER_TRANSFERRED',
      summary: `Titularidade transferida de F-1A0PR para ${pseudonym}`,
      justification: 'Venda da participação',
    });
    expect(JSON.stringify(call?.[3])).not.toMatch(/Nova Pessoa|Carla/);
  });

  it('deve recusar grupo sem proprietário e grupo arquivado', async () => {
    const input = {
      name: 'X Y Z',
      email: 'x@y.com.br',
      phone: '11911112222',
      justification: 'Motivo',
    };
    const noOwner = makeRepo({ findByNumber: vi.fn().mockResolvedValue(group({ owner: null })) });
    const archived = makeRepo({
      findByNumber: vi.fn().mockResolvedValue(group({ status: 'ARCHIVED' })),
    });

    await expect(
      makeEconomicGroupsService(noOwner).transferOwner(admin, 1, input),
    ).rejects.toMatchObject({
      code: 'GROUP_HAS_NO_OWNER',
    });
    await expect(
      makeEconomicGroupsService(archived).transferOwner(admin, 1, input),
    ).rejects.toMatchObject({
      code: 'GROUP_ARCHIVED',
    });
  });
});

describe('economic groups · Cartão Alelo', () => {
  const card = {
    holderName: 'Carla Mendonça',
    holderCpf: '52998224725',
    holderBirthDate: new Date('1980-05-20T00:00:00.000Z'),
    holderPseudonym: 'F-ALEL0',
    cardNumber: '6062825624254001',
    store: { id: 's1', code: 2, name: 'Aurora Santana', status: 'ACTIVE' },
  };

  it('deve mostrar ao administrador o CPF mascarado e só os 4 últimos dígitos', async () => {
    const repo = makeRepo({
      findByNumber: vi.fn().mockResolvedValue(group({ benefitCard: card })),
    });

    const detail = await makeEconomicGroupsService(repo).get(admin, 417);

    expect(detail.benefitCard).toEqual({
      holderPseudonym: 'F-ALEL0',
      holderName: 'Carla Mendonça',
      holderCpfMasked: '529.***.***-25',
      holderBirthDate: '1980-05-20',
      cardLast4: '4001',
      store: { code: 2, name: 'Aurora Santana', status: 'ACTIVE' },
    });
    expect(JSON.stringify(detail)).not.toContain('6062825624254001');
  });

  it('deve mostrar ao analista só o código do titular', async () => {
    const repo = makeRepo({
      findByNumber: vi.fn().mockResolvedValue(group({ benefitCard: card })),
    });

    const detail = await makeEconomicGroupsService(repo).get(analyst, 417);

    expect(detail.benefitCard).toEqual({
      holderPseudonym: 'F-ALEL0',
      store: { code: 2, name: 'Aurora Santana', status: 'ACTIVE' },
    });
  });

  const input = {
    holderName: 'Outra Pessoa',
    holderCpf: '11144477735',
    holderBirthDate: '1975-01-10',
    cardNumber: '6062825624259999',
    storeCode: 2,
  };

  it('deve gerar código novo ao trocar o titular, sem dados pessoais na auditoria', async () => {
    const repo = makeRepo({
      findByNumber: vi.fn().mockResolvedValue(group({ benefitCard: card })),
    });

    await makeEconomicGroupsService(repo).setBenefitCard(admin, 417, input);

    const call = vi.mocked(repo.saveBenefitCard).mock.calls[0];
    expect(call?.[2].holderPseudonym).not.toBe('F-ALEL0');
    expect(call?.[3].action).toBe('BENEFIT_CARD_HOLDER_CHANGED');
    expect(JSON.stringify(call?.[3])).not.toMatch(/Outra Pessoa|11144477735|9999/);
  });

  it('deve recusar loja inativa ou de outro grupo', async () => {
    const inactive = makeRepo({
      findStoreInGroup: vi.fn().mockResolvedValue({ id: 's1', status: 'INACTIVE' }),
    });
    const other = makeRepo({ findStoreInGroup: vi.fn().mockResolvedValue(null) });

    await expect(
      makeEconomicGroupsService(inactive).setBenefitCard(admin, 417, input),
    ).rejects.toMatchObject({
      code: 'STORE_NOT_ACTIVE',
    });
    await expect(
      makeEconomicGroupsService(other).setBenefitCard(admin, 417, input),
    ).rejects.toMatchObject({
      code: 'STORE_NOT_IN_GROUP',
    });
  });
});
