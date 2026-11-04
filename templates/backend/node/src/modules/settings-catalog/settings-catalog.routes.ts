import { Router } from 'express';
import { adminOnly } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { settingsCatalogController as c } from './settings-catalog.controller.js';
import {
  createItemRequest,
  deleteItemRequest,
  listAuditRequest,
  listItemsRequest,
  moveItemRequest,
  statusItemRequest,
  summaryRequest,
  updateItemRequest,
} from './settings-catalog.schemas.js';

// Configurações → Atributos da loja (specs/004). Só o administrador, inclusive para ler (FR-002).
export const settingsCatalogRouter = () => {
  const router = Router();
  router.use(adminOnly);

  router.get('/', validate(summaryRequest), c.summary);
  router.get('/:kind', validate(listItemsRequest), c.list);
  router.post('/:kind', validate(createItemRequest), c.create);
  router.get('/:kind/audit-events', validate(listAuditRequest), c.listAudit);
  router.patch('/:kind/:id', validate(updateItemRequest), c.update);
  router.post('/:kind/:id/move', validate(moveItemRequest), c.move);
  router.post('/:kind/:id/status', validate(statusItemRequest), c.setStatus);
  router.delete('/:kind/:id', validate(deleteItemRequest), c.remove);

  return router;
};
