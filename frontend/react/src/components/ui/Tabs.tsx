import { cn } from '@/lib/cn';

export type TabItem<T extends string> = { value: T; label: string };

type TabsProps<T extends string> = {
  label: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Tabs<T extends string>({ label, tabs, value, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 border-b border-border">
      {tabs.map((tab) => {
        const isSelected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px border-b-2 py-3 text-sm font-semibold transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-ring',
              isSelected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
