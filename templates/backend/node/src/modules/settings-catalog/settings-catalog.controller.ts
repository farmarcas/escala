import type { Request, Response } from 'express';
import type { z } from 'zod';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { readValidated } from '../../shared/middlewares/validate.js';
import type {
  createItemRequest,
  deleteItemRequest,
  listAuditRequest,
  listItemsRequest,
  moveItemRequest,
  statusItemRequest,
  updateItemRequest,
} from './settings-catalog.schemas.js';
import { settingsCatalogService as service } from './settings-catalog.service.js';

export const settingsCatalogController = {
  async summary(req: Request, res: Response) {
    res.json(await service.summary(readPlatformIdentity(req)));
  },

  async list(req: Request, res: Response) {
    const { params, query } = readValidated<z.infer<typeof listItemsRequest>>(res);
    res.json(await service.list(readPlatformIdentity(req), params.kind, query.status, query.q));
  },

  async create(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof createItemRequest>>(res);
    res.status(201).json(await service.create(readPlatformIdentity(req), params.kind, body));
  },

  async update(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof updateItemRequest>>(res);
    res.json(await service.update(readPlatformIdentity(req), params.kind, params.id, body));
  },

  async move(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof moveItemRequest>>(res);
    res.json(await service.move(readPlatformIdentity(req), params.kind, params.id, body));
  },

  async setStatus(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof statusItemRequest>>(res);
    res.json(await service.setStatus(readPlatformIdentity(req), params.kind, params.id, body));
  },

  async remove(req: Request, res: Response) {
    const { params, query } = readValidated<z.infer<typeof deleteItemRequest>>(res);
    await service.remove(readPlatformIdentity(req), params.kind, params.id, query.version);
    res.status(204).end();
  },

  async listAudit(req: Request, res: Response) {
    const { params, query } = readValidated<z.infer<typeof listAuditRequest>>(res);
    res.json(
      await service.listAudit(readPlatformIdentity(req), params.kind, query.page, query.pageSize),
    );
  },
};
