import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../errors/forbidden-error.js';
import { UnauthenticatedError } from '../errors/unauthenticated-error.js';
import type {
  Identity,
  IdentityProvider,
  PlatformIdentity,
  PlatformRole,
  TenantIdentity,
} from './identity.js';

export const authenticate =
  (provider: IdentityProvider) => async (req: Request, _res: Response, next: NextFunction) => {
    const identity = await provider(req);
    if (!identity) {
      next(new UnauthenticatedError());
      return;
    }
    req.identity = identity;
    next();
  };

// Caminho dedicado do operador: só identidade de plataforma entra (Product Vision §9, invariante 1).
export const requirePlatform = (req: Request, _res: Response, next: NextFunction) => {
  if (req.identity?.kind !== 'platform') {
    next(new ForbiddenError('Área exclusiva do operador Farmarcas'));
    return;
  }
  next();
};

// Caminho do grupo: só identidade de tenant entra; o RLS limita ao próprio grupo.
export const requireTenant = (req: Request, _res: Response, next: NextFunction) => {
  if (req.identity?.kind !== 'tenant') {
    next(new ForbiddenError('Área exclusiva do grupo econômico'));
    return;
  }
  next();
};

export const requirePlatformRoles =
  (roles: PlatformRole[], message: string) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (req.identity?.kind !== 'platform' || !roles.includes(req.identity.role)) {
      next(new ForbiddenError(message));
      return;
    }
    next();
  };

// Operação do Backoffice: administrador e gestor (spec 005, tabela "No Backoffice").
export const operators = requirePlatformRoles(
  ['PLATFORM_ADMIN', 'PLATFORM_MANAGER'],
  'Somente o Administrador ou o Gestor da plataforma pode fazer isso',
);

// Funcionários, acessos e Configurações: só o administrador.
export const adminOnly = requirePlatformRoles(
  ['PLATFORM_ADMIN'],
  'Somente o Administrador da plataforma pode fazer isso',
);

// Depois de requirePlatform, a identidade é sempre de plataforma.
export const readPlatformIdentity = (req: Request): PlatformIdentity => {
  if (req.identity?.kind !== 'platform') throw new ForbiddenError();
  return req.identity;
};

export const readTenantIdentity = (req: Request): TenantIdentity => {
  if (req.identity?.kind !== 'tenant') throw new ForbiddenError();
  return req.identity;
};

export const readIdentity = (req: Request): Identity => {
  if (!req.identity) throw new ForbiddenError();
  return req.identity;
};
