export type GroupStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

// O analista recebe só o pseudônimo; nome, e-mail e telefone vêm apenas para o administrador.
export type Owner = { pseudonym: string; name?: string; email?: string; phone?: string };

export type GroupBadge = 'NO_OWNER' | 'NO_ANGEL' | 'OUTDATED_STORES';

// Anjo: funcionário da Farmarcas que acompanha o grupo (aparece pelo nome).
export type Angel = {
  id: string;
  name: string;
  jobTitle: string;
  email: string;
  phone: string | null;
};

export type GroupSummary = {
  number: number;
  name: string;
  legalName: string;
  status: GroupStatus;
  owner: Owner | null;
  angel: Angel | null;
  storeCount: number;
  pdvCount: number;
  cdCount: number;
  brands: string[];
  ufs: string[];
  // Lojas em operação sem revisão do cadastro há mais de 180 dias.
  outdatedStores: number;
  badges: GroupBadge[];
};

// Cartão Alelo: o administrador recebe titular, CPF mascarado, nascimento e os 4 últimos
// dígitos; o analista, só o código do titular. O número inteiro nunca chega à tela.
export type BenefitCard = {
  holderPseudonym: string;
  holderName?: string;
  holderCpfMasked?: string;
  holderBirthDate?: string;
  cardLast4?: string;
  store: { code: number; name: string; status: string };
};

export type BenefitCardInput = {
  holderName: string;
  holderCpf: string;
  holderBirthDate: string;
  cardNumber: string;
  storeCode: number;
};

export type OwnerTransferInput = OwnerInput & { justification: string };

export type GroupDetail = GroupSummary & {
  benefitCard: BenefitCard | null;
  cnpj: string;
  activeStores: number;
  inactiveStores: number;
  pendingStores: number;
  brandsBreakdown: { name: string; count: number }[];
  ufsBreakdown: { uf: string; count: number }[];
  createdAt: string;
  updatedAt: string;
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

export type GroupSize = 'none' | 'one' | 'small' | 'medium' | 'large';

export type OwnerInput = { name: string; email: string; phone: string };

export type GroupInput = {
  name: string;
  legalName: string;
  cnpj: string;
  owner?: OwnerInput;
};

export type StatusAction = 'suspend' | 'archive' | 'restore';

export type BulkResult = { changed: number; skipped: number };

// Contexto entregue às abas que a página compõe (lojas e auditoria vêm de outras features).
export type GroupTabContext = {
  group: GroupDetail;
  canEdit: boolean;
  onChanged: () => void;
  // "Adicionar loja" também fica no topo da página; a aba de lojas abre o formulário.
  isAddingStore: boolean;
  setIsAddingStore: (value: boolean) => void;
};
