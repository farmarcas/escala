import type { Viewer } from './permissions.js';

// Como o autor de um registro aparece para quem está vendo (pseudonimização, Product Vision §6.3).
export type ActorRef = { kind: 'PLATFORM' | 'TENANT' | 'SYSTEM'; subject: string; role: string };

const PLATFORM_ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: 'Administrador da plataforma',
  PLATFORM_ANALYST: 'Analista da plataforma',
};

export type OwnerRef = { name: string; pseudonym: string } | null;

export const actorLabel = (actor: ActorRef, viewer: Viewer, owner: OwnerRef): string => {
  if (actor.kind === 'SYSTEM') return 'Sistema';
  if (actor.kind === 'PLATFORM') {
    return `${actor.subject} · ${PLATFORM_ROLE_LABEL[actor.role] ?? actor.role}`;
  }
  // Autor do grupo: o analista da plataforma vê só o código.
  if (viewer.isAnalyst || !owner || owner.pseudonym !== actor.subject) {
    return `${actor.subject} · proprietário`;
  }
  return `${owner.name} · proprietário`;
};

export const sideLabel = (kind: ActorRef['kind']) =>
  kind === 'PLATFORM' ? 'Pela Farmarcas' : kind === 'TENANT' ? 'Pelo grupo' : 'Pelo sistema';

const MASK = 'Pseudonimizado';

export const maskIf = (hidden: boolean, value: string | null): string | null =>
  hidden && value ? MASK : value;
