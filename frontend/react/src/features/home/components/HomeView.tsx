import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ErrorState, LoadingState } from '@/components/ui/States';
import type { Uf } from '@/lib/uf';
import { useHomeMap } from '../hooks/useHomeMap';
import { METRIC_ORDER, METRICS, REGIONS, regionOf, type MetricKey } from '../lib/map-metrics';
import type { RegionKey } from '../types';
import { BrazilMap } from './BrazilMap';
import { MapLegend } from './MapLegend';
import { RegionCards } from './RegionCards';
import { StatesTable } from './StatesTable';
import { UfPanel } from './UfPanel';

// Início do Backoffice (protótipo "Home Mapa"): presença da rede no mapa do Brasil.
export function HomeView() {
  const navigate = useNavigate();
  const { map, isLoading, error, reload } = useHomeMap();
  const [metric, setMetric] = useState<MetricKey>('stores');
  const [region, setRegion] = useState<RegionKey | null>(null);
  const [uf, setUf] = useState<Uf | null>(null);
  const presence = useMemo(() => new Map((map?.ufs ?? []).map((item) => [item.uf, item])), [map]);

  const selectUf = (next: Uf) => {
    setUf(next);
    setRegion(regionOf(next));
  };
  const selectRegion = (next: RegionKey | null) => {
    setUf(null);
    setRegion(next);
  };
  // Sobe um nível: da UF para a região, da região para o Brasil.
  const zoomOut = () => (uf ? setUf(null) : setRegion(null));

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (isLoading || !map) return <LoadingState label="Carregando o mapa da rede" />;

  return (
    <>
      <div className="flex flex-wrap items-stretch gap-4">
        <Card as="section" className="flex min-w-0 flex-[999_1_560px] flex-col overflow-hidden">
          <h2 className="sr-only">Mapa da rede</h2>
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <div className="max-w-full overflow-x-auto">
              <SegmentedControl
                label="Medida do mapa"
                value={metric}
                onChange={setMetric}
                segments={METRIC_ORDER.map((key) => ({ value: key, label: METRICS[key].label }))}
              />
            </div>
            {(region || uf) && (
              <Button variant="link" size="sm" onClick={zoomOut}>
                ‹ Voltar para {uf && region ? REGIONS[region].name : 'o Brasil'}
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="secondary" size="sm" onClick={() => navigate('/visao-geral')}>
              Visão geral
            </Button>
          </div>
          <div className="flex min-h-[300px] flex-1 px-4 pt-2 md:min-h-[460px]">
            <BrazilMap
              presence={presence}
              metric={metric}
              region={region}
              uf={uf}
              onSelectUf={selectUf}
              onZoomOut={zoomOut}
            />
          </div>
          <MapLegend metric={metric} />
        </Card>

        <div className="relative flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <RegionCards map={map} region={region} onSelect={selectRegion} />
          {uf && (
            // No desktop o painel cobre os cartões (protótipo); no celular fica abaixo deles.
            <div className="lg:absolute lg:inset-0 lg:z-[2] lg:flex lg:flex-col">
              <UfPanel
                uf={uf}
                presence={presence.get(uf)}
                networkStores={map.totals.stores}
                onClose={() => setUf(null)}
                onOpenGroups={() => navigate(`/grupos?uf=${uf}`)}
                onOpenStores={() => navigate(`/lojas?uf=${uf}&status=OPERATING`)}
              />
            </div>
          )}
        </div>
      </div>

      <StatesTable
        ufs={map.ufs}
        networkStores={map.totals.stores}
        metric={metric}
        region={region}
        uf={uf}
        onSelectUf={selectUf}
      />
    </>
  );
}
