import { useEffect, useRef } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatGroupNumber, formatNumber, pluralize } from '@/lib/format';
import type { Uf } from '@/lib/uf';
import { BRAZIL_GEOMETRY } from '../lib/brazil-geometry';
import {
  brandMix,
  formatDecimal,
  percentOf,
  REGIONS,
  regionOf,
  storesPerGroup,
} from '../lib/map-metrics';
import type { UfPresence } from '../types';

// Literais completos para o Tailwind achar as classes; a 4ª cor é "Outras".
const SERIES_BG = ['bg-series-1', 'bg-series-2', 'bg-series-3'];

const sectionTitle = 'text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground';

type UfPanelProps = {
  uf: Uf;
  presence: UfPresence | undefined;
  networkStores: number;
  onClose: () => void;
  onOpenGroups: () => void;
  onOpenStores: () => void;
};

// Painel do estado escolhido: indicadores, cidades, marcas, grupos e atalhos para as listas.
export function UfPanel({
  uf,
  presence,
  networkStores,
  onClose,
  onOpenGroups,
  onOpenStores,
}: UfPanelProps) {
  const region = REGIONS[regionOf(uf)].name;
  const panelRef = useRef<HTMLElement>(null);
  // Escolher o estado pela tabela, lá embaixo, traz o painel para a vista.
  useEffect(() => {
    panelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [uf]);
  return (
    <section
      ref={panelRef}
      aria-label={`Detalhe de ${BRAZIL_GEOMETRY[uf].name}`}
      className="overflow-y-auto rounded-lg border border-border bg-surface shadow-[0_8px_24px_-6px_rgb(6_25_56/0.18)] xl:h-full"
    >
      <div className="flex items-center gap-2.5 border-b border-border px-[18px] py-3.5 shadow-[inset_4px_0_0_0_var(--color-primary)]">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold">{BRAZIL_GEOMETRY[uf].name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {presence
              ? `${region} · ${Math.round(percentOf(presence.stores, networkStores))}% das lojas da rede`
              : `${region} · sem presença`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar o detalhe do estado"
          className="flex size-7 items-center justify-center rounded-sm border border-border text-secondary-foreground hover:bg-subtle focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      {presence ? (
        <PresenceDetail presence={presence} />
      ) : (
        <p className="px-[18px] py-4 text-[13px] leading-relaxed text-muted-foreground">
          Nenhum grupo econômico ou loja associada nesta UF.
        </p>
      )}

      {presence && (
        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-background px-[18px] py-3">
          <Button size="sm" className="flex-1" onClick={onOpenGroups}>
            Ver grupos de {uf}
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={onOpenStores}>
            Ver lojas de {uf}
          </Button>
        </div>
      )}
    </section>
  );
}

function PresenceDetail({ presence }: { presence: UfPresence }) {
  const mix = brandMix(presence);
  const leader = presence.brands[0]?.name;
  const biggestCity = presence.topCities[0]?.stores ?? 1;
  const inTopCities = presence.topCities.reduce((sum, city) => sum + city.stores, 0);
  const kpis = [
    {
      label: 'Lojas',
      value: formatNumber(presence.stores),
      context: `em ${pluralize(presence.cities, 'cidade', 'cidades')}`,
    },
    {
      label: 'Grupos',
      value: formatNumber(presence.groups),
      context: `${formatDecimal(storesPerGroup(presence))} lojas por grupo`,
    },
    {
      label: 'Com proprietário',
      value: `${formatNumber(presence.groupsWithOwner)} de ${formatNumber(presence.groups)}`,
      context: `${Math.round(percentOf(presence.groupsWithOwner, presence.groups))}% dos grupos`,
    },
    {
      label: 'Marcas',
      value: formatNumber(presence.brands.length),
      context: leader ? `líder: ${leader}` : '—',
    },
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-px border-b border-subtle bg-subtle">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface px-[18px] py-3">
            <dt className={sectionTitle}>{kpi.label}</dt>
            <dd className="mt-1 text-xl font-bold">{kpi.value}</dd>
            <dd className="mt-0.5 text-[11px] text-muted-foreground">{kpi.context}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-4 px-[18px] py-3.5">
        <div>
          <h3 className={cn(sectionTitle, 'mb-2')}>Cidades com mais lojas</h3>
          <ul>
            {presence.topCities.map((city) => (
              <li key={city.city} className="py-1">
                <div className="mb-[3px] flex text-[13px]">
                  <span className="flex-1">{city.city}</span>
                  <span className="font-semibold">{formatNumber(city.stores)}</span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${percentOf(city.stores, biggestCity)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {presence.stores > inTopCities
              ? `${pluralize(presence.stores - inTopCities, 'loja', 'lojas')} em outras ${pluralize(presence.cities - presence.topCities.length, 'cidade', 'cidades')}`
              : 'Todas as lojas nas cidades acima'}
          </p>
        </div>

        <div>
          <h3 className={cn(sectionTitle, 'mb-2')}>Lojas por marca</h3>
          <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {mix.map((slice, index) => (
              <div
                key={slice.name}
                className={slice.isOther ? 'bg-control' : SERIES_BG[index]}
                style={{ width: `${slice.percent}%` }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5">
            {mix.map((slice, index) => (
              <li key={slice.name} className="flex items-center gap-1.5 text-xs">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2 rounded-sm',
                    slice.isOther ? 'bg-control' : SERIES_BG[index],
                  )}
                />
                {slice.name} <b>{slice.percent}%</b>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className={cn(sectionTitle, 'mb-1')}>Principais grupos econômicos</h3>
          <ul>
            {presence.topGroups.map((group) => (
              <li key={group.number}>
                <Link
                  to={`/grupos/${group.number}`}
                  className="flex items-center gap-2.5 border-b border-subtle py-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="w-9 font-mono text-xs text-secondary-foreground">
                    {formatGroupNumber(group.number)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {group.name}
                  </span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {pluralize(group.stores, 'loja', 'lojas')}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 text-control" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
