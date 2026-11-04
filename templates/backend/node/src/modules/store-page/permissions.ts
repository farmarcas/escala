import type { Identity } from '../../shared/identity/identity.js';

export type Side = 'platform' | 'tenant';
export type StepOwner = 'any' | 'group' | 'platform' | 'system' | 'end';

export type Viewer = {
  side: Side;
  subject: string;
  role: string;
  isReadOnly: boolean;
  isAnalyst: boolean;
};

// Quem está vendo a loja e se pode escrever. Grupo suspenso ou arquivado fica só leitura
// para o próprio grupo (a Farmarcas continua operando).
export const viewerOf = (identity: Identity, groupStatus: string): Viewer => {
  if (identity.kind === 'platform') {
    // Gestor opera como o administrador; só o analista fica em leitura (spec 005).
    const isAnalyst = identity.role === 'PLATFORM_ANALYST';
    return {
      side: 'platform',
      subject: identity.subject,
      role: identity.role,
      isReadOnly: isAnalyst,
      isAnalyst,
    };
  }
  return {
    side: 'tenant',
    subject: identity.subject,
    role: identity.role,
    isReadOnly: identity.role !== 'TENANT_ADMIN' || groupStatus !== 'ACTIVE',
    isAnalyst: false,
  };
};

// Documentos que cada lado envia direto na aba Documentos (US10).
const PLATFORM_DOCS = ['CNPJ_CARD', 'ASSOCIATION_CONTRACT'];
const TENANT_DOCS = ['OPERATING_PERMIT', 'SANITARY_LICENSE', 'AFE', 'CRF'];

export type StorePermissions = {
  canEditBasic: boolean;
  requiresReason: boolean;
  canEditOwnerPrivate: boolean;
  canSeeOwnerPrivate: boolean;
  canOpenRequest: boolean;
  canValidate: boolean;
  canRemind: boolean;
  // Estratégias: o grupo define, a Farmarcas vê (M1 RN-C17).
  canEditStrategies: boolean;
  canEditFurniture: boolean;
  // Seções livres: criadas pela Farmarcas, visíveis para o grupo.
  canEditFreeSections: boolean;
  // Ferramentas externas e canais: o grupo preenche; a Farmarcas acompanha.
  canEditTools: boolean;
  canEditChannels: boolean;
  uploadableDocuments: string[];
};

export const permissionsOf = (viewer: Viewer): StorePermissions => {
  const canWrite = !viewer.isReadOnly;
  const isPlatform = viewer.side === 'platform';
  return {
    canEditBasic: canWrite,
    requiresReason: isPlatform,
    canEditOwnerPrivate: canWrite && !isPlatform,
    canSeeOwnerPrivate: !viewer.isAnalyst,
    canOpenRequest: canWrite,
    canValidate: canWrite && !isPlatform,
    canRemind: canWrite && isPlatform,
    canEditStrategies: canWrite && !isPlatform,
    canEditFurniture: canWrite,
    canEditFreeSections: canWrite && isPlatform,
    canEditTools: canWrite && !isPlatform,
    canEditChannels: canWrite && !isPlatform,
    uploadableDocuments: canWrite ? (isPlatform ? PLATFORM_DOCS : TENANT_DOCS) : [],
  };
};

// A vez de agir numa etapa: grupo age nas etapas do grupo; a Farmarcas nas suas e nas do sistema.
export const ownsStep = (viewer: Viewer, owner: StepOwner): boolean => {
  if (viewer.isReadOnly) return false;
  if (owner === 'group') return viewer.side === 'tenant';
  if (owner === 'platform' || owner === 'system') return viewer.side === 'platform';
  return false;
};
