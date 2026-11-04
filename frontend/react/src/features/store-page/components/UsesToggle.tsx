import { cn } from '@/lib/cn';

type UsesToggleProps = { label: string; value: boolean | null; onChange: (value: boolean) => void };

// Sim / Não para "a loja usa?" (ferramentas e canais).
export function UsesToggle({ label, value, onChange }: UsesToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex overflow-hidden rounded-md border border-border"
    >
      {[
        { option: true, text: 'Sim' },
        { option: false, text: 'Não' },
      ].map(({ option, text }, index) => (
        <button
          key={text}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'px-3 py-1.5 text-[13px] font-medium',
            index > 0 && 'border-l border-border',
            value === option
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface text-secondary-foreground hover:bg-subtle',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function usesTone(uses: boolean | null): 'success' | 'neutral' | 'warning' {
  return uses === null ? 'warning' : uses ? 'success' : 'neutral';
}

export function usesText(uses: boolean | null): string {
  return uses === null ? 'Não informado' : uses ? 'Usa' : 'Não usa';
}
