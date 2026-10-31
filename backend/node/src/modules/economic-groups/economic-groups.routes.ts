import { Router } from 'express';
import { requirePlatformRole } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { createGroupStoreRequest, listGroupStoresRequest } from '../stores/stores.schemas.js';
import { makeStoresControllerFor } from '../stores/stores.routes.js';
import type { StoresRepository } from '../stores/stores.service.js';
import { makeEconomicGroupsController } from './economic-groups.controller.js';
import { economicGroupsRepository } from './economic-groups.repository.js';
import {
  bulkAngelRequest,
  createGroupRequest,
  getGroupRequest,
  groupStatsRequest,
  listGroupAuditRequest,
  listGroupsRequest,
  setAngelRequest,
  statusChangeRequest,
  updateGroupRequest,
} from './economic-groups.schemas.js';
import {
  makeEconomicGroupsService,
  type EconomicGroupsRepository,
} from './economic-groups.service.js';

const adminOnly = requirePlatformRole('PLATFORM_ADMIN');

export const economicGroupsRouter = (
  repo: EconomicGroupsRepository = economicGroupsRepository,
  storesRepo?: StoresRepository,
) => {
  const controller = makeEconomicGroupsController(makeEconomicGroupsService(repo));
  const stores = makeStoresControllerFor(storesRepo);
  const router = Router();

  router.get('/', validate(listGroupsRequest), controller.list);
  router.get('/stats', validate(groupStatsRequest), controller.stats);
  router.post('/', adminOnly, validate(createGroupRequest), controller.create);
  router.post('/bulk-angel', adminOnly, validate(bulkAngelRequest), controller.bulkAngel);
  router.get('/:number', validate(getGroupRequest), controller.get);
  router.patch('/:number', adminOnly, validate(updateGroupRequest), controller.update);
  router.post(
    '/:number/status-changes',
    adminOnly,
    validate(statusChangeRequest),
    controller.changeStatus,
  );
  router.put('/:number/angel', adminOnly, validate(setAngelRequest), controller.setAngel);
  router.get('/:number/audit-events', validate(listGroupAuditRequest), controller.listAudit);
  router.get('/:number/stores', validate(listGroupStoresRequest), stores.listByGroup);
  router.post(
    '/:number/stores',
    adminOnly,
    validate(createGroupStoreRequest),
    stores.createInGroup,
  );

  return router;
};
