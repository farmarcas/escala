import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { UFS, type Uf } from '@/lib/uf';
import { BRAZIL_GEOMETRY } from '../lib/brazil-geometry';
import {
  binOf,
  frameFor,
  LABEL_OFFSET,
  METRICS,
  REGIONS,
  regionOf,
  type MetricKey,
} from '../lib/map-metrics';
import type { RegionKey, UfPresence } from '../types';

// Literais completos para o Tailwind achar as classes.
const BIN_FILL = ['fill-map-1', 'fill-map-2', 'fill-map-3', 'fill-map-4', 'fill-map-5'];

type BrazilMapProps = {
  presence: Map<Uf, UfPresence>;
  metric: MetricKey;
  region: RegionKey | null;
  uf: Uf | null;
  onSelectUf: (uf: Uf) => void;
  onZoomOut: () => void;
};

// Mapa do Brasil em SVG, pintado pela medida escolhida. O zoom é um transform animado
// no grupo do mapa; o quadro mede o próprio tamanho para enquadrar Brasil, região ou UF.
export function BrazilMap({ presence, metric, region, uf, onSelectUf, onZoomOut }: BrazilMapProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  // Até medir o quadro não há zoom animado: senão o mapa "voa" do tamanho padrão ao abrir.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const [hovered, setHovered] = useState<Uf | null>(null);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = element;
      if (width && height) setSize({ width, height });
    };
    measure();
    // A animação só liga depois do primeiro quadro já enquadrado.
    const frameId = requestAnimationFrame(() => setIsAnimated(true));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  const focus = uf ? [uf] : region ? REGIONS[region].ufs : null;
  const width = size?.width ?? 900;
  const height = size?.height ?? 480;
  const frame = frameFor(focus, width, height);
  // Traço e etiquetas mantêm o tamanho na tela, qualquer que seja o zoom.
  const k = (focus ? 1 : 0.8) / frame.scale;
  const isInFocus = (id: Uf) =>
    !focus || focus.includes(id) || (uf !== null && regionOf(id) === region);
  const { value, format } = METRICS[metric];

  // A UF escolhida é desenhada por último, para o contorno escuro ficar por cima.
  const order = uf ? [...UFS.filter((id) => id !== uf), uf] : UFS;
  const hover = hovered ? presence.get(hovered) : undefined;

  return (
    <div ref={frameRef} className="relative min-h-[300px] flex-1 overflow-hidden">
      <p
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-3 top-3 z-[1] rounded-md bg-foreground/90 px-2.5 py-1.5 text-xs font-medium text-surface transition-opacity duration-150',
          hovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        {hovered &&
          `${BRAZIL_GEOMETRY[hovered].name} · ${
            hover
              ? `${formatNumber(hover.stores)} lojas · ${formatNumber(hover.groups)} grupos`
              : 'sem lojas associadas'
          }`}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Mapa do Brasil com a presença da rede por estado. Os mesmos números estão na tabela Estados."
        className="absolute inset-0 block size-full"
      >
        <rect
          x={-2000}
          y={-2000}
          width={5000}
          height={5000}
          fill="transparent"
          onClick={onZoomOut}
        />
        <g
          className={cn(
            !size && 'invisible',
            isAnimated &&
              'transition-transform duration-[550ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none',
          )}
          style={{
            transform: `translate(${frame.translateX}px, ${frame.translateY}px) scale(${frame.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {order.map((id) => {
            const data = presence.get(id);
            const isSelected = uf === id;
            const isHovered = hovered === id;
            return (
              <path
                key={id}
                d={BRAZIL_GEOMETRY[id].path}
                onClick={() => onSelectUf(id)}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered((current) => (current === id ? null : current))}
                strokeWidth={(isSelected ? 1.6 : isHovered ? 1.2 : 0.8) * k}
                opacity={isInFocus(id) ? 1 : 0.35}
                className={cn(
                  'cursor-pointer transition-[fill,opacity] duration-150',
                  data ? BIN_FILL[binOf(metric, value(data))] : 'fill-map-empty',
                  isSelected
                    ? 'stroke-foreground'
                    : isHovered
                      ? 'stroke-secondary-foreground'
                      : 'stroke-surface',
                )}
              />
            );
          })}
          {UFS.filter((id) => presence.has(id) && isInFocus(id)).map((id) => {
            const shape = BRAZIL_GEOMETRY[id];
            const [dx, dy] = LABEL_OFFSET[id] ?? [0, 0];
            const cx = shape.x + shape.width / 2 + dx * k;
            const cy = shape.y + shape.height / 2 + dy * k;
            const text = format(value(presence.get(id)!));
            const width = Math.max(30, text.length * 7.4 + 12) * k;
            const height = 28 * k;
            const isSelected = uf === id;
            return (
              <g
                key={`label-${id}`}
                className="cursor-pointer"
                onClick={() => onSelectUf(id)}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered((current) => (current === id ? null : current))}
              >
                <rect
                  x={cx - width / 2}
                  y={cy - height / 2}
                  width={width}
                  height={height}
                  rx={6 * k}
                  strokeWidth={0.8 * k}
                  className={cn(
                    'drop-shadow-[0_1px_1.5px_rgb(6_25_56/0.25)]',
                    isSelected
                      ? 'fill-foreground stroke-foreground'
                      : 'fill-surface stroke-control',
                  )}
                />
                <text
                  x={cx}
                  y={cy - 3 * k}
                  textAnchor="middle"
                  fontSize={8 * k}
                  fontWeight={700}
                  letterSpacing={0.4 * k}
                  className={isSelected ? 'fill-control' : 'fill-muted-foreground'}
                >
                  {id}
                </text>
                <text
                  x={cx}
                  y={cy + 9 * k}
                  textAnchor="middle"
                  fontSize={12 * k}
                  fontWeight={700}
                  className={isSelected ? 'fill-surface' : 'fill-foreground'}
                >
                  {text}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
