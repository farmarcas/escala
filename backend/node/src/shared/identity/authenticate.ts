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

export const requirePlatformRole =
  (role: PlatformRole) => (req: Request, _res: Response, next: NextFunction) => {
    if (req.identity?.kind !== 'platform' || req.identity.role !== role) {
      next(new ForbiddenError('Somente o Administrador da plataforma pode fazer isso'));
      return;
    }
    next();
  };

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
