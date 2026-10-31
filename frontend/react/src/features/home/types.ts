import type { Uf } from '@/lib/uf';

export type RegionKey = 'N' | 'NE' | 'CO' | 'SE' | 'S';

export type NetworkTotals = { stores: number; groups: number; groupsWithOwner: number };

export type UfPresence = NetworkTotals & {
  uf: Uf;
  cities: number;
  topCities: { city: string; stores: number }[];
  brands: { name: string; stores: number }[];
  topGroups: { number: number; name: string; stores: number }[];
};

export type HomeMap = {
  totals: NetworkTotals;
  regions: (NetworkTotals & { region: RegionKey })[];
  ufs: UfPresence[];
};
