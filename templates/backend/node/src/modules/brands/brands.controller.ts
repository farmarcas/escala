import type { Request, Response } from 'express';
import type { z } from 'zod';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { readValidated } from '../../shared/middlewares/validate.js';
import type {
  deleteBrandRequest,
  listBrandsRequest,
  createBrandRequest,
  updateBrandRequest,
} from './brands.schemas.js';
import type { BrandsService } from './brands.service.js';

export const makeBrandsController = (service: BrandsService) => ({
  async list(req: Request, res: Response) {
    const { query } = readValidated<z.infer<typeof listBrandsRequest>>(res);
    const { page, pageSize, ...filter } = query;
    res.json(await service.list(readPlatformIdentity(req), filter, page, pageSize));
  },

  async stats(req: Request, res: Response) {
    res.json(await service.stats(readPlatformIdentity(req)));
  },

  async create(req: Request, res: Response) {
    const { body } = readValidated<z.infer<typeof createBrandRequest>>(res);
    res.status(201).json(await service.create(readPlatformIdentity(req), body));
  },

  async update(req: Request, res: Response) {
    const { params, body } = readValidated<z.infer<typeof updateBrandRequest>>(res);
    res.json(await service.update(readPlatformIdentity(req), params.id, body));
  },

  async remove(req: Request, res: Response) {
    const { params } = readValidated<z.infer<typeof deleteBrandRequest>>(res);
    await service.remove(readPlatformIdentity(req), params.id);
    res.status(204).send();
  },
});
