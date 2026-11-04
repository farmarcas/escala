import type { Identity } from '../shared/identity/identity.js';

declare global {
  namespace Express {
    interface Locals {
      validated?: unknown;
    }

    interface Request {
      identity?: Identity;
    }
  }
}

export {};
