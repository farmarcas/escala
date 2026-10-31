import { METRICS, type MetricKey } from '../lib/map-metrics';

// Literais completos para o Tailwind achar as classes.
const BIN_BG = ['bg-map-1', 'bg-map-2', 'bg-map-3', 'bg-map-4', 'bg-map-5'];

type MapLegendProps = { metric: MetricKey };

export function MapLegend({ metric }: MapLegendProps) {
  const { label, binLabels } = METRICS[metric];
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 pb-3.5 pt-2.5 text-[11px] text-muted-foreground">
      <span className="font-semibold text-secondary-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-2.5 w-3.5 rounded-sm border border-border bg-map-empty"
        />
        Sem presença
      </span>
      {binLabels.map((bin, index) => (
        <span key={bin} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-2.5 w-3.5 rounded-sm ${BIN_BG[index]}`} />
          {bin}
        </span>
      ))}
      <span className="flex-1" />
      <span>
        Dados do cadastro, atualizados agora · clique em um estado para detalhar · mapa
        svg-maps/brazil (CC BY 4.0)
      </span>
    </div>
  );
}
