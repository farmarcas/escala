import { cn } from '@/lib/cn';

type ProgressBarProps = { percent: number; label: string };

// Barra de progresso com cor por faixa: completo, 80–99% e abaixo de 80%.
export function ProgressBar({ percent, label }: ProgressBarProps) {
  const tone = percent >= 100 ? 'bg-success' : percent >= 80 ? 'bg-warning' : 'bg-destructive';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-subtle"
    >
      <div
        className={cn('h-full rounded-full', tone)}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}
