import type { Request, Response } from 'express';
import type { z } from 'zod';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { readValidated } from '../../shared/middlewares/validate.js';
import type {
  createGroupStoreRequest,
  listGroupStoresRequest,
  listStoresRequest,
  updateStoreRequest,
} from './stores.schemas.js';
import type { StoresService } from './stores.service.js';

export const makeStoresController = (service: StoresService) => ({
  async list(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof listStoresRequest>>(res);
    res.json(await service.list(readPlatformIdentity(req), query));
  },

  async stats(req: Request, res: Response) {
    res.json(await service.stats(readPlatformIdentity(req)));
  },

  async updateStatus(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof updateStoreRequest>>(res);
    res.json(await service.updateStatus(readPlatformIdentity(req), params.id, body));
  },

  async listByGroup(req: Request, res: Response) {
    const { params, query } = readValidated<z.infer<typeof listGroupStoresRequest>>(res);
    res.json(await service.listByGroup(readPlatformIdentity(req), params.number, query));
  },

  async createInGroup(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof createGroupStoreRequest>>(res);
    res.status(201).json(await service.create(readPlatformIdentity(req), params.number, body));
  },
});

export type StoresController = ReturnType<typeof makeStoresController>;
