import type { Request, Response } from 'express';
import type { z } from 'zod';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { readValidated } from '../../shared/middlewares/validate.js';
import type {
  createContactRequest,
  createPartnerRequest,
  deleteContactRequest,
  getPartnerRequest,
  listPartnersRequest,
  partnerAuditRequest,
  partnerStatusRequest,
  updateContactRequest,
  updatePartnerRequest,
} from './partners.schemas.js';
import type { PartnersService } from './partners.service.js';

export const makePartnersController = (service: PartnersService) => ({
  async list(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof listPartnersRequest>>(res);
    const { page, pageSize, ...filter } = query;
    res.json(await service.list(readPlatformIdentity(req), filter, page, pageSize));
  },

  async stats(req: Request, res: Response) {
    res.json(await service.stats(readPlatformIdentity(req)));
  },

  async get(req: Request, res: Response) {
    const { params } = readValidated<z.infer<typeof getPartnerRequest>>(res);
    res.json(await service.get(readPlatformIdentity(req), params.id));
  },

  async create(req: Request, res: Response) {
    const { body } = readValidated<z.infer<typeof createPartnerRequest>>(res);
    res.status(201).json(await service.create(readPlatformIdentity(req), body));
  },

  async update(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof updatePartnerRequest>>(res);
    res.json(await service.update(readPlatformIdentity(req), params.id, body));
  },

  async changeStatus(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof partnerStatusRequest>>(res);
    res.json(await service.changeStatus(readPlatformIdentity(req), params.id, body));
  },

  async addContact(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof createContactRequest>>(res);
    res.status(201).json(await service.addContact(readPlatformIdentity(req), params.id, body));
  },

  async updateContact(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof updateContactRequest>>(res);
    res.json(
      await service.updateContact(readPlatformIdentity(req), params.id, params.contactId, body),
    );
  },

  async removeContact(req: Request, res: Response) {
    const { params } = readValidated<z.infer<typeof deleteContactRequest>>(res);
    res.json(await service.removeContact(readPlatformIdentity(req), params.id, params.contactId));
  },

  async listAudit(req: Request, res: Response) {
    const { params, query } = readValidated<z.infer<typeof partnerAuditRequest>>(res);
    res.json(
      await service.listAudit(readPlatformIdentity(req), params.id, query.page, query.pageSize),
    );
  },
});
