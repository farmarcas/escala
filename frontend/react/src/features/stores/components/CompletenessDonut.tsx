import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { StoreStats } from '../types';

type Band = 'complete' | 'partial' | 'low';

const BANDS: { value: Band; label: string; hint: string; dot: string }[] = [
  { value: 'complete', label: 'Completo', hint: '100% preenchido', dot: 'bg-success' },
  { value: 'partial', label: 'Falta algo', hint: '80% a 99%', dot: 'bg-warning' },
  { value: 'low', label: 'Falta muito', hint: 'abaixo de 80%', dot: 'bg-destructive' },
];

type CompletenessDonutProps = {
  stats: StoreStats | undefined;
  selected: string;
  onSelect: (band: Band) => void;
};

// Rosca do preenchimento do cadastro: cada nível da legenda filtra a lista.
export function CompletenessDonut({ stats, selected, onSelect }: CompletenessDonutProps) {
  const bands = stats?.completenessBands ?? { complete: 0, partial: 0, low: 0 };
  const total = stats?.total ?? 0;
  const share = (count: number) => (total ? (count / total) * 100 : 0);
  const green = share(bands.complete);
  const yellow = green + share(bands.partial);
  const ring = total
    ? `conic-gradient(var(--color-success) 0 ${green}%, var(--color-warning) ${green}% ${yellow}%, var(--color-destructive) ${yellow}% 100%)`
    : 'var(--color-subtle)';

  return (
    <Card className="flex flex-col gap-2.5 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground">
        Preenchimento do cadastro
      </p>
      <div className="flex items-center gap-3.5">
        <div
          aria-hidden="true"
          className="flex size-[84px] shrink-0 items-center justify-center rounded-full"
          style={{ background: ring }}
        >
          <div className="flex size-[58px] flex-col items-center justify-center rounded-full bg-surface">
            <span className="text-base font-bold leading-none">{stats?.avgCompleteness ?? 0}%</span>
            <span className="mt-0.5 text-[10px] text-muted-foreground">média</span>
          </div>
        </div>
        <ul
          className="flex min-w-0 flex-1 flex-col gap-0.5"
          aria-label="Lojas por nível de preenchimento"
        >
          {BANDS.map((band) => {
            const count = bands[band.value];
            return (
              <li key={band.value}>
                <button
                  type="button"
                  aria-pressed={selected === band.value}
                  title={band.hint}
                  onClick={() => onSelect(band.value)}
                  className={cn(
                    '-mx-1.5 flex w-[calc(100%+12px)] items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs hover:bg-subtle',
                    'focus-visible:outline-2 focus-visible:outline-ring',
                    selected === band.value && 'bg-primary-tint',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('size-2 shrink-0 rounded-full', band.dot)}
                  />
                  <span className="flex-1 whitespace-nowrap">{band.label}</span>
                  <span className="font-bold">{formatNumber(count)}</span>
                  <span className="w-[30px] text-right text-muted-foreground">
                    {Math.round(share(count))}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
