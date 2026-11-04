import { Router } from 'express';
import { operators } from '../../shared/identity/authenticate.js';
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

export const brandsRouter = (repo: BrandsRepository = brandsRepository) => {
  const controller = makeBrandsController(makeBrandsService(repo));
  const router = Router();

  router.get('/', validate(listBrandsRequest), controller.list);
  router.get('/stats', validate(brandStatsRequest), controller.stats);
  router.post('/', operators, validate(createBrandRequest), controller.create);
  router.patch('/:id', operators, validate(updateBrandRequest), controller.update);
  router.delete('/:id', operators, validate(deleteBrandRequest), controller.remove);

  return router;
};
