import { Router } from 'express';
import { operators } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { createGroupStoreRequest, listGroupStoresRequest } from '../stores/stores.schemas.js';
import { makeStoresControllerFor } from '../stores/stores.routes.js';
import type { StoresRepository } from '../stores/stores.service.js';
import { makeEconomicGroupsController } from './economic-groups.controller.js';
import { economicGroupsRepository } from './economic-groups.repository.js';
import {
  benefitCardRequest,
  bulkAngelRequest,
  createGroupRequest,
  getGroupRequest,
  groupFacetsRequest,
  groupStatsRequest,
  listGroupAuditRequest,
  listGroupsRequest,
  ownerTransferRequest,
  setAngelRequest,
  statusChangeRequest,
  updateGroupRequest,
} from './economic-groups.schemas.js';
import {
  makeEconomicGroupsService,
  type EconomicGroupsRepository,
} from './economic-groups.service.js';

export const economicGroupsRouter = (
  repo: EconomicGroupsRepository = economicGroupsRepository,
  storesRepo?: StoresRepository,
) => {
  const controller = makeEconomicGroupsController(makeEconomicGroupsService(repo));
  const stores = makeStoresControllerFor(storesRepo);
  const router = Router();

  router.get('/', validate(listGroupsRequest), controller.list);
  router.get('/stats', validate(groupStatsRequest), controller.stats);
  router.get('/facets', validate(groupFacetsRequest), controller.facets);
  router.get('/export', validate(listGroupsRequest), controller.exportCsv);
  router.post('/', operators, validate(createGroupRequest), controller.create);
  router.post('/bulk-angel', operators, validate(bulkAngelRequest), controller.bulkAngel);
  router.get('/:number', validate(getGroupRequest), controller.get);
  router.patch('/:number', operators, validate(updateGroupRequest), controller.update);
  router.post(
    '/:number/status-changes',
    operators,
    validate(statusChangeRequest),
    controller.changeStatus,
  );
  router.put('/:number/angel', operators, validate(setAngelRequest), controller.setAngel);
  router.post(
    '/:number/owner-transfer',
    operators,
    validate(ownerTransferRequest),
    controller.transferOwner,
  );
  router.put(
    '/:number/benefit-card',
    operators,
    validate(benefitCardRequest),
    controller.setBenefitCard,
  );
  router.get('/:number/audit-events', validate(listGroupAuditRequest), controller.listAudit);
  router.get('/:number/stores', validate(listGroupStoresRequest), stores.listByGroup);
  router.post(
    '/:number/stores',
    operators,
    validate(createGroupStoreRequest),
    stores.createInGroup,
  );

  return router;
};
