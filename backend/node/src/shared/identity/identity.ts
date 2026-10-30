import type { Request } from 'express';

export type PlatformRole = 'PLATFORM_ADMIN' | 'PLATFORM_ANALYST';
export type TenantRole = 'TENANT_ADMIN' | 'TENANT_USER';

// Quem está agindo. Vem do provedor de identidade (Product Vision §6), nunca do corpo da requisição.
export type PlatformIdentity = { kind: 'platform'; subject: string; role: PlatformRole };
export type TenantIdentity = {
  kind: 'tenant';
  subject: string;
  role: TenantRole;
  tenantId: string;
};
export type Identity = PlatformIdentity | TenantIdentity;

// Interface plugável: hoje o provedor de demonstração; em produção, o Keycloak.
export type IdentityProvider = (req: Request) => Identity | null | Promise<Identity | null>;

export const isPlatformAdmin = (identity: Identity): boolean =>
  identity.kind === 'platform' && identity.role === 'PLATFORM_ADMIN';
