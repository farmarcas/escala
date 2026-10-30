import { Router } from 'express';
import { withActor } from '../../shared/database/with-actor.js';
import {
  authenticate,
  readTenantIdentity,
  requireTenant,
} from '../../shared/identity/authenticate.js';
import type { IdentityProvider } from '../../shared/identity/identity.js';
import { NotFoundError } from '../../shared/errors/not-found-error.js';
import { validate } from '../../shared/middlewares/validate.js';
import { storePageRouter } from '../store-page/store-page.routes.js';
import { storesRepository } from '../stores/stores.repository.js';
import { listStoresRequest } from '../stores/stores.schemas.js';
import { makeStoresService } from '../stores/stores.service.js';
import type { z } from 'zod';
import { readValidated } from '../../shared/middlewares/validate.js';

// Caminho do grupo econômico (tenant). Só identidade de tenant entra; o RLS do banco
// garante que cada grupo veja apenas as próprias lojas (Product Vision §9, invariante 1).
export const tenantRouter = (identityProvider: IdentityProvider) => {
  const router = Router();
  const stores = makeStoresService(storesRepository);
  router.use(authenticate(identityProvider), requireTenant);

  router.get('/me', async (req, res) => {
    const identity = readTenantIdentity(req);
    const group = await withActor(identity, (tx) =>
      tx.economicGroup.findFirst({ select: { number: true, name: true, status: true } }),
    );
    if (!group) throw new NotFoundError('Grupo não encontrado', 'GROUP_NOT_FOUND');
    res.json({ subject: identity.subject, role: identity.role, group });
  });

  router.get('/stores', validate(listStoresRequest), async (req, res) => {
    const { query } = readValidated<z.infer<typeof listStoresRequest>>(res);
    res.json(await stores.list(readTenantIdentity(req), query));
  });

  // Marcas ativas (catálogo da plataforma) para o pedido de troca de bandeira.
  router.get('/brands', async (req, res) => {
    const brands = await withActor(readTenantIdentity(req), (tx) =>
      tx.brand.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, name: true, status: true },
        orderBy: { name: 'asc' },
      }),
    );
    res.json({ data: brands });
  });

  router.use(storePageRouter());
  return router;
};
