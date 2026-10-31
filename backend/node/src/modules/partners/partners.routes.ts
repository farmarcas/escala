import { Router } from 'express';
import { requirePlatformRole } from '../../shared/identity/authenticate.js';
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
  partnerStatsRequest,
  partnerStatusRequest,
  updateContactRequest,
  updatePartnerRequest,
} from './partners.schemas.js';
import { makePartnersService, type PartnersRepository } from './partners.service.js';

const adminOnly = requirePlatformRole('PLATFORM_ADMIN');

// Parceiros da Farmarcas: indústrias e distribuidores (spec 003, US3). Os dois papéis
// consultam; só o administrador grava. Parceiro não é excluído, só inativado.
export const partnersRouter = (repo: PartnersRepository = partnersRepository) => {
  const controller = makePartnersController(makePartnersService(repo));
  const router = Router();

  router.get('/', validate(listPartnersRequest), controller.list);
  router.get('/stats', validate(partnerStatsRequest), controller.stats);
  router.get('/:id', validate(getPartnerRequest), controller.get);
  router.post('/', adminOnly, validate(createPartnerRequest), controller.create);
  router.patch('/:id', adminOnly, validate(updatePartnerRequest), controller.update);
  router.post('/:id/status', adminOnly, validate(partnerStatusRequest), controller.changeStatus);
  router.post('/:id/contacts', adminOnly, validate(createContactRequest), controller.addContact);
  router.patch(
    '/:id/contacts/:contactId',
    adminOnly,
    validate(updateContactRequest),
    controller.updateContact,
  );
  router.delete(
    '/:id/contacts/:contactId',
    adminOnly,
    validate(deleteContactRequest),
    controller.removeContact,
  );
  router.get('/:id/audit-events', validate(partnerAuditRequest), controller.listAudit);

  return router;
};
