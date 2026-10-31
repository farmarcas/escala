import { Router } from 'express';
import {
  authenticate,
  readPlatformIdentity,
  requirePlatform,
} from '../../shared/identity/authenticate.js';
import type { IdentityProvider } from '../../shared/identity/identity.js';
import { brandsRouter } from '../brands/brands.routes.js';
import type { BrandsRepository } from '../brands/brands.service.js';
import { economicGroupsRouter } from '../economic-groups/economic-groups.routes.js';
import type { EconomicGroupsRepository } from '../economic-groups/economic-groups.service.js';
import { homeRouter } from '../home/home.routes.js';
import { overviewRouter } from '../overview/overview.routes.js';
import { storePageRouter } from '../store-page/store-page.routes.js';
import { storesRouter } from '../stores/stores.routes.js';
import type { StoresRepository } from '../stores/stores.service.js';

export type BackofficeDeps = {
  identityProvider: IdentityProvider;
  brandsRepository?: BrandsRepository;
  economicGroupsRepository?: EconomicGroupsRepository;
  storesRepository?: StoresRepository;
};

// Caminho dedicado do operador Farmarcas (Product Vision §6.3 e §9): só identidade de
// plataforma entra. A futura suíte do associado terá o próprio prefixo (/api/v1/tenant).
export const backofficeRouter = (deps: BackofficeDeps) => {
  const router = Router();
  router.use(authenticate(deps.identityProvider), requirePlatform);

  router.get('/me', (req, res) => {
    const { subject, role, kind } = readPlatformIdentity(req);
    res.json({ subject, role, kind });
  });

  router.use('/home', homeRouter());
  router.use('/overview', overviewRouter());
  router.use('/brands', brandsRouter(deps.brandsRepository));
  router.use(
    '/economic-groups',
    economicGroupsRouter(deps.economicGroupsRepository, deps.storesRepository),
  );
  router.use('/stores', storesRouter(deps.storesRepository));
  // Página da loja: mesmas rotas do caminho do grupo (/api/v1/tenant).
  router.use(storePageRouter());

  return router;
};
