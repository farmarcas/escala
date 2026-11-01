import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

type CheckItemProps = {
  label: string;
  checked: boolean;
  isEditing: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  className?: string;
};

// Caixinha do protótipo "Loja Detalhe": em edição marca; em leitura mostra o marcado em cinza.
export function CheckItem({
  label,
  checked,
  isEditing,
  disabled = false,
  onToggle,
  className,
}: CheckItemProps) {
  const canToggle = isEditing && !disabled;
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
            isEditing && disabled && 'opacity-50',
          )}
        >
          {checked && <Check aria-hidden="true" strokeWidth={3} className="size-3" />}
        </span>
      )}
      <span className={cn(checked ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
    </label>
  );
}
