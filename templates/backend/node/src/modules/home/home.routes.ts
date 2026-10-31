import { Router } from 'express';
import { withActor } from '../../shared/database/with-actor.js';
import { readPlatformIdentity } from '../../shared/identity/authenticate.js';
import { homeRepository } from './home.repository.js';

// Início do Backoffice: presença da rede por estado, lida do cadastro na hora.
// Leitura para os dois papéis da plataforma; não traz dado de pessoa.
export const homeRouter = () => {
  const router = Router();
  router.get('/map', async (req, res) => {
    res.json(await withActor(readPlatformIdentity(req), (tx) => homeRepository.map(tx)));
  });
  return router;
};
