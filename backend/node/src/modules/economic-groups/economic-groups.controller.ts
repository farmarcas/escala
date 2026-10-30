import type { Request, Response } from 'express';
import type { z } from 'zod';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { readValidated } from '../../shared/middlewares/validate.js';
import type {
  createGroupRequest,
  getGroupRequest,
  listGroupAuditRequest,
  listGroupsRequest,
  statusChangeRequest,
  updateGroupRequest,
} from './economic-groups.schemas.js';
import type { EconomicGroupsService } from './economic-groups.service.js';

export const makeEconomicGroupsController = (service: EconomicGroupsService) => ({
  async list(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof listGroupsRequest>>(res);
    res.json(await service.list(readPlatformIdentity(req), query));
  },

  async stats(req: Request, res: Response) {
    res.json(await service.stats(readPlatformIdentity(req)));
  },

  async get(req: Request, res: Response) {
    const { params } = readValidated<z.infer<typeof getGroupRequest>>(res);
    res.json(await service.get(readPlatformIdentity(req), params.number));
  },

  async create(req: Request, res: Response) {
    const { body } = readValidated<z.infer<typeof createGroupRequest>>(res);
    res.status(201).json(await service.create(readPlatformIdentity(req), body));
  },

  async update(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof updateGroupRequest>>(res);
    res.json(await service.update(readPlatformIdentity(req), params.number, body));
  },

  async changeStatus(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof statusChangeRequest>>(res);
    res.json(await service.changeStatus(readPlatformIdentity(req), params.number, body));
  },

  async listAudit(req: Request, res: Response) {
    const { params, query } = readValidated<z.infer<typeof listGroupAuditRequest>>(res);
    res.json(
      await service.listAudit(readPlatformIdentity(req), params.number, query.page, query.pageSize),
    );
  },
});
