import { Router } from 'express';
import { operators } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { makePartnersController } from './partners.controller.js';
import { partnersRepository } from './partners.repository.js';
import {
  createContactRequest,
  createPartnerRequest,
  deleteContactRequest,
  getPartnerRequest,
  listPartnersRequest,
  partnerAuditRequest,
  partnerFacetsRequest,
  partnerStatsRequest,
  partnerStatusRequest,
  updateContactRequest,
  updatePartnerRequest,
} from './partners.schemas.js';
import { makePartnersService, type PartnersRepository } from './partners.service.js';

// Parceiros da Farmarcas: indústrias e distribuidores (spec 003, US3). Os dois papéis
// consultam; administrador e gestor gravam (spec 005). Parceiro não é excluído, só inativado.
export const partnersRouter = (repo: PartnersRepository = partnersRepository) => {
  const controller = makePartnersController(makePartnersService(repo));
  const router = Router();

  router.get('/', validate(listPartnersRequest), controller.list);
  router.get('/stats', validate(partnerStatsRequest), controller.stats);
  router.get('/facets', validate(partnerFacetsRequest), controller.facets);
  router.get('/export', validate(listPartnersRequest), controller.exportCsv);
  router.get('/:id', validate(getPartnerRequest), controller.get);
  router.post('/', operators, validate(createPartnerRequest), controller.create);
  router.patch('/:id', operators, validate(updatePartnerRequest), controller.update);
  router.post('/:id/status', operators, validate(partnerStatusRequest), controller.changeStatus);
  router.post('/:id/contacts', operators, validate(createContactRequest), controller.addContact);
  router.patch(
    '/:id/contacts/:contactId',
    operators,
    validate(updateContactRequest),
    controller.updateContact,
  );
  router.delete(
    '/:id/contacts/:contactId',
    operators,
    validate(deleteContactRequest),
    controller.removeContact,
  );
  router.get('/:id/audit-events', validate(partnerAuditRequest), controller.listAudit);

  return router;
};
