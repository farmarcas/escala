export type StoreType = 'PDV' | 'CD';
export type StoreStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

export type Store = {
  id: string;
  code: number;
  groupNumber: number;
  groupName: string;
  brand: { id: string; name: string; status: 'ACTIVE' | 'HISTORICAL' };
  name: string;
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
  createdAt: string;
  completeness: { filled: number; total: number };
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
