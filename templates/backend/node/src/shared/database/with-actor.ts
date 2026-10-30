import type { Prisma } from '../../generated/prisma/client.js';
import type { Identity } from '../identity/identity.js';
import { prisma } from './prisma.js';

export type Tx = Prisma.TransactionClient;

// Toda leitura e escrita em tabela com RLS passa por aqui: abre uma transação e diz ao
// banco quem está agindo (app.actor_kind e app.tenant_id valem só dentro dela).
export const withActor = <T>(identity: Identity, fn: (tx: Tx) => Promise<T>): Promise<T> =>
  prisma.$transaction(async (tx) => {
    const tenantId = identity.kind === 'tenant' ? identity.tenantId : '';
    await tx.$queryRaw`SELECT set_config('app.actor_kind', ${identity.kind}, true), set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
