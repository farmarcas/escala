import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

export type Segment<T extends string> = { value: T; label: string; count?: number };

type SegmentedControlProps<T extends string> = {
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  isDisabled?: boolean;
  title?: string;
};

export function SegmentedControl<T extends string>({
  label,
  segments,
  value,
  onChange,
  isDisabled = false,
  title,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={isDisabled || undefined}
      title={title}
      className={cn(
        'flex shrink-0 overflow-hidden rounded-md border border-border bg-surface',
        isDisabled && 'opacity-60',
      )}
    >
      {segments.map((segment, index) => {
        const isSelected = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isDisabled}
            onClick={() => onChange(segment.value)}
            className={cn(
              'whitespace-nowrap px-3.5 py-2 text-[13px] font-medium transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              index > 0 && 'border-l border-border',
              isSelected
                ? 'bg-foreground text-surface'
                : 'text-secondary-foreground hover:bg-subtle',
            )}
          >
            {segment.label}
            {segment.count !== undefined && (
              <span className="ml-1 opacity-65">{formatNumber(segment.count)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
