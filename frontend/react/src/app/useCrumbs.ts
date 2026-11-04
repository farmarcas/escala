import { useMatches, type Params } from 'react-router-dom';
import type { Crumb } from '@/components/layout/TopBar';

export type RouteHandle = { crumbs: (params: Params) => Crumb[] };

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && 'crumbs' in handle;
}

// Breadcrumb da rota mais interna que declarou um.
export function useCrumbs(): Crumb[] {
  const matches = useMatches();
  const last = [...matches].reverse().find((match) => isRouteHandle(match.handle));
  return last && isRouteHandle(last.handle) ? last.handle.crumbs(last.params) : [];
}
