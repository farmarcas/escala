export type StoreType = 'PDV' | 'CD';
export type StoreStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type StoreStage = 'PROSPECTING' | 'SETUP' | 'OPENED';

export type Store = {
  id: string;
  code: number;
  groupNumber: number;
  groupName: string;
  // Anjo do grupo: as lojas mostram o Anjo do grupo.
  angel: { id: string; name: string; jobTitle: string; email: string; phone: string | null } | null;
  brand: { id: string; name: string; status: 'ACTIVE' | 'HISTORICAL' };
  name: string;
  legalName: string | null;
  type: StoreType;
  cnpj: string;
  street: string;
  number: string | null;
  district: string | null;
  zip: string | null;
  city: string;
  uf: string;
  openedAt: string | null;
  status: StoreStatus;
  // Etapa na rede e bloqueio pela Farmarcas (spec 003, US4).
  stage: StoreStage;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  // Em operação e sem mudança nem validação há mais de 90 dias.
  isOutdated: boolean;
  createdAt: string;
  // missing: campos vazios (vem na lista da rede).
  completeness: { filled: number; total: number; missing?: string[] };
  validation: {
    status: 'never' | 'ok' | 'due_soon' | 'overdue';
    validatedAt: string | null;
    days: number | null;
  };
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
  avgCompleteness: number;
  completenessBands: { complete: number; partial: number; low: number };
  validationAttention: number;
  docAlerts: { docs: number; stores: number };
  openRequests: { requests: number; stores: number };
};

export type StoreInput = {
  name: string;
  type: StoreType;
  cnpj: string;
  brandId: string;
  street: string;
  number: string;
  district: string;
  zip?: string;
  city: string;
  uf: string;
  openedAt?: string;
  stage?: StoreStage;
};

// O que as lojas precisam saber do grupo (vem da página, sem importar a feature de grupos).
export type StoreGroupContext = {
  number: number;
  name: string;
  isArchived: boolean;
  pdvCount: number;
  cdCount: number;
  storeCount: number;
};
