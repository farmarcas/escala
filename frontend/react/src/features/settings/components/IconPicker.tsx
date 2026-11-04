import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FURNITURE_ICON_GROUPS, furnitureIcon, searchIcons } from '@/lib/furniture-icons';

type IconPickerProps = {
  value: string;
  onChange: (key: string) => void;
};

// Galeria de ícones do mobiliário (specs/004, FR-021): grupos, busca sem acento e teclado.
export function IconPicker({ value, onChange }: IconPickerProps) {
  const labelId = useId();
  const [term, setTerm] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const found = searchIcons(term);
  const groups = FURNITURE_ICON_GROUPS.map((group) => ({
    group,
    icons: found.filter((item) => item.group === group),
  })).filter((entry) => entry.icons.length > 0);
  const flat = groups.flatMap((entry) => entry.icons);
  const selected = furnitureIcon(value);
  const focusKey = flat.some((item) => item.key === value) ? value : flat[0]?.key;

  // Setas andam pela grade na ordem em que aparece; Enter ou espaço escolhe.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const columns = Math.max(1, Math.round((listRef.current?.clientWidth ?? 0) / 56));
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[
      event.key as 'ArrowRight'
    ];
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : Math.min(buttons.length - 1, Math.max(0, current + (step ?? 0)));
    buttons[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={labelId} className="text-[13px] font-semibold text-secondary-foreground">
          Ícone <span className="text-destructive-text">*</span>
        </p>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Escolhido: <span className="font-semibold text-foreground">{selected.label}</span>
        </p>
      </div>
      <label className="flex h-9 items-center gap-2 rounded-md border border-control bg-surface px-3 focus-within:border-primary">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">Buscar ícone</span>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar ícone: geladeira, caixa, tela…"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <div
        ref={listRef}
        role="listbox"
        aria-labelledby={labelId}
        onKeyDown={handleKeyDown}
        className="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-md border border-border bg-background p-3"
      >
        {groups.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum ícone com “{term}”. Tente outra palavra.
          </p>
        )}
        {groups.map(({ group, icons }) => (
          <div key={group} role="group" aria-label={group}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
              {group}
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2">
              {icons.map(({ key, icon: Icon, label }) => {
                const isSelected = key === value;
                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-label={label}
                    title={label}
                    tabIndex={key === focusKey ? 0 : -1}
                    onClick={() => onChange(key)}
                    className={cn(
                      'flex h-12 items-center justify-center rounded-md border transition-colors duration-150',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      isSelected
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-transparent bg-surface text-secondary-foreground hover:border-control',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
