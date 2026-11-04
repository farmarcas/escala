import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

type SearchFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SearchField({ label, value, onChange, className }: SearchFieldProps) {
  return (
    <div
      className={cn(
        'flex min-w-[200px] items-center gap-2 rounded-full border border-border bg-background px-3.5',
        'focus-within:border-primary',
        className,
      )}
    >
      <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full bg-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  );
}
