import type { Request } from 'express';
import { withActor } from '../database/with-actor.js';
import type { IdentityProvider, PlatformIdentity, TenantIdentity } from './identity.js';

// Só para ambiente local (DEMO_IDENTITY_ENABLED=true). O env.ts impede o uso em produção.
// Lê o cabeçalho x-demo-role; sem ele (ou com valor desconhecido) vale o papel mais restrito.
const DEMO_IDENTITIES: Record<'admin' | 'manager' | 'analyst', PlatformIdentity> = {
  admin: { kind: 'platform', subject: 'OP-02', role: 'PLATFORM_ADMIN' },
  manager: { kind: 'platform', subject: 'OP-05', role: 'PLATFORM_MANAGER' },
  analyst: { kind: 'platform', subject: 'OP-07', role: 'PLATFORM_ANALYST' },
};

const PLATFORM_LOOKUP: PlatformIdentity = DEMO_IDENTITIES.analyst;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Proprietário do grupo": x-demo-role=owner + x-demo-tenant=<id do grupo>.
// O sujeito é o pseudônimo do proprietário, como será com o provedor real.
const ownerIdentity = async (req: Request): Promise<TenantIdentity | null> => {
  const tenantId = req.header('x-demo-tenant') ?? '';
  if (!UUID.test(tenantId)) return null;
  const owner = await withActor(PLATFORM_LOOKUP, (tx) =>
    tx.groupOwner.findFirst({
      where: { economicGroupId: tenantId, deletedAt: null },
      select: { pseudonym: true },
    }),
  );
  if (!owner) return null;
  return { kind: 'tenant', subject: owner.pseudonym, role: 'TENANT_ADMIN', tenantId };
};

export const demoIdentityProvider: IdentityProvider = (req) => {
  const role = req.header('x-demo-role');
  if (role === 'owner') return ownerIdentity(req);
  if (role === 'admin') return DEMO_IDENTITIES.admin;
  if (role === 'manager') return DEMO_IDENTITIES.manager;
  return DEMO_IDENTITIES.analyst;
};

// Sem provedor configurado ninguém entra (falha fechada).
export const noIdentityProvider: IdentityProvider = () => null;
