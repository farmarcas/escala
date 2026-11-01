import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

type CheckItemProps = {
  label: string;
  checked: boolean;
  isEditing: boolean;
  disabled?: boolean;
  // Item desativado em Configurações: a loja pode desmarcar, mas não marcar de novo.
  isInactive?: boolean;
  onToggle?: () => void;
  className?: string;
};

// Marca do item desativado em Configurações (specs/004, FR-031).
export function InactiveTag() {
  return (
    <span
      title="A Farmarcas desativou este item: fica só nas lojas que já usam"
      className="whitespace-nowrap rounded-full bg-subtle px-1.5 py-px text-[10px] font-bold text-secondary-foreground"
    >
      desativado
    </span>
  );
}

// Caixinha do protótipo "Loja Detalhe": em edição marca; em leitura mostra o marcado em cinza.
export function CheckItem({
  label,
  checked,
  isEditing,
  disabled = false,
  isInactive = false,
  onToggle,
  className,
}: CheckItemProps) {
  const canToggle = isEditing && !disabled && !(isInactive && !checked);
  return (
    <label
      className={cn(
        'flex min-w-0 items-center gap-2 text-[13px]',
        canToggle ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
    >
      {canToggle ? (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="size-4 shrink-0 accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      ) : (
        <span
          role="img"
          aria-label={checked ? 'Marcado' : 'Não marcado'}
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-sm border',
            checked
              ? isEditing
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground bg-muted-foreground text-surface'
              : 'border-control bg-surface',
            isEditing && !canToggle && 'opacity-50',
          )}
        >
          {checked && <Check aria-hidden="true" strokeWidth={3} className="size-3" />}
        </span>
      )}
      <span className={cn(checked ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
      {isInactive && <InactiveTag />}
    </label>
  );
}
