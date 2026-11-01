import type { Side } from '@/lib/api';

export type { Side };

export type ValidationStatus = 'never' | 'ok' | 'due_soon' | 'overdue';

export type FieldMeta = { at: string; side: 'PLATFORM' | 'TENANT' | 'SYSTEM'; by: string };

export type BasicKey =
  | 'name'
  | 'tradeName'
  | 'storeCategory'
  | 'affiliatedNetwork'
  | 'openedAt'
  | 'phone1'
  | 'phone2'
  | 'whatsapp'
  | 'deliveryPhone'
  | 'email'
  | 'ownerMobile'
  | 'ownerPersonalEmail'
  | 'popZip'
  | 'popStreet'
  | 'popNumber'
  | 'popDistrict'
  | 'popComplement'
  | 'popCity'
  | 'popUf';

export type StorePermissions = {
  canEditBasic: boolean;
  requiresReason: boolean;
  canEditOwnerPrivate: boolean;
  canSeeOwnerPrivate: boolean;
  canOpenRequest: boolean;
  canValidate: boolean;
  canRemind: boolean;
  canEditStrategies: boolean;
  canEditFurniture: boolean;
  canEditFreeSections: boolean;
  canEditTools: boolean;
  canEditChannels: boolean;
  uploadableDocuments: string[];
};

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN' | 'HOLIDAY';

export type OpeningHour = {
  day: Weekday;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  is24h: boolean;
  isOnCall: boolean;
};

export type Structure = {
  ownBuilding: boolean | null;
  areaM2: number | null;
  salesAreaM2: number | null;
  staffCount: number | null;
  demandSystemId: string | null;
};

export type Selections = { services: string[]; practiceTools: string[]; pbms: string[] };

export type FreeSection = {
  id?: string;
  title: string;
  createdBy?: string;
  fields: { label: string; value: string }[];
};

export type CatalogKind =
  | 'SERVICE'
  | 'DEMAND_SYSTEM'
  | 'PRACTICE_TOOL'
  | 'PBM'
  | 'STRATEGY'
  | 'FURNITURE'
  | 'EXTERNAL_TOOL'
  | 'CHANNEL';

export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  name: string;
  groupLabel: string | null;
  description: string | null;
  negotiatedMonthlyCents: number | null;
  icon: string | null;
  selfService: boolean;
  usedByScale: boolean;
  // Desativado em Configurações: só aparece na loja que já usa (specs/004).
  active: boolean;
};

export type StorePage = {
  code: number;
  version: number;
  side: Side;
  isReadOnly: boolean;
  group: { number: number; name: string; status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' };
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  type: 'PDV' | 'CD';
  receita: {
    cnpj: string;
    stateRegistration: string | null;
    legalName: string | null;
    zip: string | null;
    street: string;
    number: string | null;
    district: string | null;
    city: string;
    uf: string;
  };
  business: {
    brand: { id: string; name: string; status: 'ACTIVE' | 'HISTORICAL' };
    taxRegime: 'SIMPLES' | 'PRESUMIDO' | 'REAL' | null;
  };
  basic: Record<BasicKey, string | null>;
  fieldMeta: Partial<Record<string, FieldMeta>>;
  governance: {
    filled: number;
    total: number;
    missing: string[];
    validation: {
      status: ValidationStatus;
      days: number | null;
      dueAt: string | null;
      validatedAt: string | null;
      validatedBy: string | null;
      remindedAt: string | null;
    };
  };
  structure: Structure;
  hours: OpeningHour[];
  selections: Selections;
  strategies: { itemId: string; since: string | null }[];
  furniture: { itemId: string; quantity: number; tradeQuantity: number }[];
  freeSections: FreeSection[];
  tools: { itemId: string; uses: boolean | null; monthlyCostCents: number | null }[];
  channels: { itemId: string; uses: boolean | null; identifier: string | null }[];
  customEntries: CustomEntry[];
  noExternalTools: boolean;
  owner: {
    pseudonym: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  stage: 'PROSPECTING' | 'SETUP' | 'OPENED';
  // Só a Farmarcas recebe: o grupo nem abre loja bloqueada.
  block: { at: string; reason: string | null; by: string | null } | null;
  // Anjo do grupo: pessoa da Farmarcas que acompanha a loja.
  angel: { name: string; jobTitle: string; email: string; phone: string | null } | null;
  documentAlerts: number;
  openRequests: number;
  permissions: StorePermissions;
};

export type RequestType = 'CNPJ' | 'ADDRESS' | 'BRAND' | 'TAX_REGIME';
export type RequestAction = 'advance' | 'reject' | 'contest' | 'cancel';

export type ChangeRequest = {
  id: string;
  type: RequestType;
  title: string;
  effect: string;
  status: 'OPEN' | 'EFFECTIVE' | 'REJECTED' | 'CONTESTED' | 'CANCELLED';
  version: number;
  origin: 'PLATFORM' | 'TENANT';
  originLabel: string;
  requestedBy: string;
  createdAt: string;
  effectiveDate: string | null;
  justification: string;
  closedNote: string | null;
  values: { key: string; label: string; current: string | null; requested: string | null }[];
  currentStep: number;
  stepCount: number;
  waitingFor: string | null;
  isMyTurn: boolean;
  steps: {
    label: string;
    owner: string | null;
    state: 'done' | 'current' | 'pending';
    doneAt: string | null;
    doneBy: string | null;
  }[];
  documents: {
    docType: string;
    label: string;
    attached: { id: string; fileName: string } | null;
  }[];
  actions: { action: RequestAction; label: string; tone: 'primary' | 'danger' | 'secondary' }[];
};

export type HistoryRow = {
  id: string;
  at: string;
  kind: 'EDIT' | 'REQUEST' | 'DOCUMENT' | 'VALIDATION' | 'REMINDER';
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
  justification: string | null;
  side: 'PLATFORM' | 'TENANT' | 'SYSTEM';
  sideLabel: string;
  by: string;
};

export type CustomEntry = {
  id: string;
  kind: 'EXTERNAL_TOOL' | 'CHANNEL';
  name: string;
  category: string | null;
  identifier: string | null;
  monthlyCostCents: number | null;
};

export type DocumentStatus = 'valid' | 'due_soon' | 'expired' | 'missing';

export type StoreDocumentRow = {
  docType: string;
  label: string;
  canUpload: boolean;
  status: DocumentStatus;
  document: {
    id: string;
    fileName: string;
    sizeBytes: number;
    validUntil: string | null;
    uploadedAt: string;
    uploadedBy: string;
  } | null;
};
