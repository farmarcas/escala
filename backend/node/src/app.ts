import express from 'express';
import { pinoHttp } from 'pino-http';
import { prisma } from './shared/database/prisma.js';
import { logger } from './shared/logger.js';
import { errorHandler } from './shared/middlewares/error-handler.js';
import { requestId } from './shared/middlewares/request-id.js';
import { env } from './config/env.js';
import { backofficeRouter, type BackofficeDeps } from './modules/backoffice/backoffice.routes.js';
import { demoRouter } from './modules/demo/demo.routes.js';
import { tenantRouter } from './modules/tenant/tenant.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import type { UsersRepository } from './modules/users/users.service.js';
import {
  demoIdentityProvider,
  noIdentityProvider,
} from './shared/identity/demo-identity-provider.js';

type AppDeps = Partial<BackofficeDeps> & {
  usersRepository?: UsersRepository;
};

// Provedor de identidade: o de demonstração só existe com DEMO_IDENTITY_ENABLED (nunca em produção).
const defaultIdentityProvider = env.DEMO_IDENTITY_ENABLED
  ? demoIdentityProvider
  : noIdentityProvider;

export const createApp = (deps: AppDeps = {}) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok' });
    } catch (error) {
      logger.warn({ err: error }, 'readiness check failed');
      res.status(503).json({
        error: { code: 'NOT_READY', message: 'Banco indisponível', details: [] },
      });
    }
  });

  app.use('/api/v1/users', usersRouter(deps.usersRepository));
  const identityProvider = deps.identityProvider ?? defaultIdentityProvider;
  app.use('/api/v1/backoffice', backofficeRouter({ ...deps, identityProvider }));
  // Caminho do grupo econômico (tenant): separado do operador, isolado pelo RLS.
  app.use('/api/v1/tenant', tenantRouter(identityProvider));
  // Seletor de grupo do papel de demonstração: só existe no ambiente local.
  if (env.DEMO_IDENTITY_ENABLED) app.use('/api/v1/demo', demoRouter());

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Rota não encontrada', details: [] },
    });
  });

  app.use(errorHandler);
  return app;
};

export const app = createApp();
