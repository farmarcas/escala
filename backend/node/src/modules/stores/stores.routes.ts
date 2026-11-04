import { Router } from 'express';
import { operators } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { makeStoresController } from './stores.controller.js';
import { storesRepository } from './stores.repository.js';
import {
  blockChangeRequest,
  bulkBlockRequest,
  listStoresRequest,
  stageChangeRequest,
  storeFacetsRequest,
  storeStatsRequest,
  updateStoreRequest,
} from './stores.schemas.js';
import { makeStoresService, type StoresRepository } from './stores.service.js';

export const makeStoresControllerFor = (repo: StoresRepository = storesRepository) =>
  makeStoresController(makeStoresService(repo));

export const storesRouter = (repo?: StoresRepository) => {
  const controller = makeStoresControllerFor(repo);
  const router = Router();

  router.get('/', validate(listStoresRequest), controller.list);
  router.get('/stats', validate(storeStatsRequest), controller.stats);
  router.get('/export', validate(listStoresRequest), controller.exportCsv);
  router.get('/facets', validate(storeFacetsRequest), controller.facets);
  router.patch('/:id/status', operators, validate(updateStoreRequest), controller.updateStatus);
  router.post('/bulk', operators, validate(bulkBlockRequest), controller.bulkBlock);
  // Etapa e bloqueio pelo código da loja (LJ-NNN), como a página da loja.
  router.patch('/:code/stage', operators, validate(stageChangeRequest), controller.changeStage);
  router.post('/:code/block', operators, validate(blockChangeRequest), controller.block);
  router.post('/:code/unblock', operators, validate(blockChangeRequest), controller.unblock);

  return router;
};
