import { cn } from '@/lib/cn';
import { formatNumber, pluralize } from '@/lib/format';
import { UFS } from '@/lib/uf';
import { percentOf, REGION_ORDER, REGIONS } from '../lib/map-metrics';
import type { HomeMap, RegionKey } from '../types';

type RegionCardsProps = {
  map: HomeMap;
  region: RegionKey | null;
  onSelect: (region: RegionKey | null) => void;
};

type CardData = {
  key: RegionKey | null;
  name: string;
  stores: number;
  groups: number;
  present: number;
  states: number;
  bar: number;
};

// Cartão Brasil e um por região: lojas, % da rede, grupos e estados com presença.
export function RegionCards({ map, region, onSelect }: RegionCardsProps) {
  const present = new Set(map.ufs.map((presence) => presence.uf));
  const byRegion = new Map(map.regions.map((totals) => [totals.region, totals]));
  const biggest = Math.max(1, ...map.regions.map((totals) => totals.stores));

  const cards: CardData[] = [
    {
      key: null,
      name: 'Brasil',
      stores: map.totals.stores,
      groups: map.totals.groups,
      present: present.size,
      states: UFS.length,
      bar: 100,
    },
    ...REGION_ORDER.map((key) => {
      const totals = byRegion.get(key);
      const ufs = REGIONS[key].ufs;
      return {
        key,
        name: REGIONS[key].name,
        stores: totals?.stores ?? 0,
        groups: totals?.groups ?? 0,
        present: ufs.filter((uf) => present.has(uf)).length,
        states: ufs.length,
        bar: Math.max(2, percentOf(totals?.stores ?? 0, biggest)),
      };
    }),
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => {
        const isSelected = card.key === region;
        return (
          <button
            key={card.name}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected && card.key ? null : card.key)}
            className={cn(
              'rounded-lg border bg-surface px-4 py-3.5 text-left shadow-card transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              isSelected
                ? 'border-primary bg-primary-tint ring-1 ring-primary'
                : 'border-border hover:border-control',
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'flex-1 text-[13px] font-semibold',
                  isSelected && 'text-primary-hover',
                )}
              >
                {card.name}
              </span>
              <span
                className={cn(
                  'text-xs font-bold',
                  isSelected ? 'text-primary-hover' : 'text-muted-foreground',
                )}
              >
                {Math.round(percentOf(card.stores, map.totals.stores))}%
              </span>
            </span>
            <span className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold leading-none">{formatNumber(card.stores)}</span>
              <span className="text-xs text-muted-foreground">lojas</span>
            </span>
            <span className="mt-2.5 block h-[5px] overflow-hidden rounded-full bg-subtle">
              <span className="block h-full bg-primary" style={{ width: `${card.bar}%` }} />
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              {pluralize(card.groups, 'grupo', 'grupos')} · {card.present} de {card.states} estados
            </span>
          </button>
        );
      })}
    </div>
  );
}
