import { Router } from 'express';
import { z } from 'zod';
import { UFS } from '../../shared/br/uf.js';
import { requestSchema } from '../../shared/http/request-schemas.js';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { readValidated, validate } from '../../shared/middlewares/validate.js';
import { overviewService } from './overview.service.js';

const overviewRequest = requestSchema({
  query: z.object({ brandId: z.string().uuid().optional(), uf: z.enum(UFS).optional() }).strict(),
});

// Visão geral do Backoffice: agregados do cadastro, com filtro por marca e UF da loja.
export const overviewRouter = () => {
  const router = Router();
  router.get('/', validate(overviewRequest), async (req, res) => {
    const { query } = readValidated<z.infer<typeof overviewRequest>>(res);
    res.json(await overviewService.get(readPlatformIdentity(req), query));
  });
  return router;
};
