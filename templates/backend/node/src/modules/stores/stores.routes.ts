import { Router } from 'express';
import { requirePlatformRole } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { makeStoresController } from './stores.controller.js';
import { storesRepository } from './stores.repository.js';
import { listStoresRequest, storeStatsRequest, updateStoreRequest } from './stores.schemas.js';
import { makeStoresService, type StoresRepository } from './stores.service.js';

export const makeStoresControllerFor = (repo: StoresRepository = storesRepository) =>
  makeStoresController(makeStoresService(repo));

export const storesRouter = (repo?: StoresRepository) => {
  const controller = makeStoresControllerFor(repo);
  const router = Router();

  router.get('/', validate(listStoresRequest), controller.list);
  router.get('/stats', validate(storeStatsRequest), controller.stats);
  router.patch(
    '/:id/status',
    requirePlatformRole('PLATFORM_ADMIN'),
    validate(updateStoreRequest),
    controller.updateStatus,
  );

  return router;
};
