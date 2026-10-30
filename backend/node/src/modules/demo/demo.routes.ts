import { Router } from 'express';
import { withActor } from '../../shared/database/with-actor.js';

// Lista de grupos para o seletor "Proprietário do grupo". Só é montada com
// DEMO_IDENTITY_ENABLED (app.ts); em produção a rota não existe.
export const demoRouter = () => {
  const router = Router();

  router.get('/tenants', async (_req, res) => {
    const groups = await withActor(
      { kind: 'platform', subject: 'DEMO', role: 'PLATFORM_ANALYST' },
      (tx) =>
        tx.economicGroup.findMany({
          where: { deletedAt: null, owners: { some: { deletedAt: null } } },
          select: { id: true, number: true, name: true },
          orderBy: { number: 'asc' },
        }),
    );
    res.json({ data: groups });
  });

  return router;
};
