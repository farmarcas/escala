import { Router } from 'express';
import { requirePlatformRole } from '../../shared/identity/authenticate.js';
import { validate } from '../../shared/middlewares/validate.js';
import { makeBrandsController } from './brands.controller.js';
import { brandsRepository } from './brands.repository.js';
import {
  brandStatsRequest,
  createBrandRequest,
  deleteBrandRequest,
  listBrandsRequest,
  updateBrandRequest,
} from './brands.schemas.js';
import { makeBrandsService, type BrandsRepository } from './brands.service.js';

const adminOnly = requirePlatformRole('PLATFORM_ADMIN');

export const brandsRouter = (repo: BrandsRepository = brandsRepository) => {
  const controller = makeBrandsController(makeBrandsService(repo));
  const router = Router();

  router.get('/', validate(listBrandsRequest), controller.list);
  router.get('/stats', validate(brandStatsRequest), controller.stats);
  router.post('/', adminOnly, validate(createBrandRequest), controller.create);
  router.patch('/:id', adminOnly, validate(updateBrandRequest), controller.update);
  router.delete('/:id', adminOnly, validate(deleteBrandRequest), controller.remove);

  return router;
};
