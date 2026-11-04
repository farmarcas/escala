import { useId, type ComponentPropsWithoutRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { controlClass, errorClass, hintClass, labelClass } from './fieldStyles';

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = Omit<ComponentPropsWithoutRef<'select'>, 'id' | 'children'> & {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isLabelInline?: boolean;
};

export function SelectField({
  label,
  options,
  placeholder,
  hint,
  errorMessage,
  isRequired = false,
  isLabelInline = false,
  className,
  ...selectProps
}: SelectFieldProps) {
  const id = useId();
  const describedBy = errorMessage ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const select = (
    <div className="relative">
      <select
        id={id}
        required={isRequired}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={describedBy}
        className={cn(
          controlClass,
          'appearance-none pr-9',
          isLabelInline ? 'h-9 font-medium' : 'h-12',
        )}
        {...selectProps}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );

  if (isLabelInline) {
    return (
      <div className={cn('flex items-center gap-2 text-[13px]', className)}>
        <label htmlFor={id} className="whitespace-nowrap text-muted-foreground">
          {label}
        </label>
        {select}
      </div>
    );
  }

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {isRequired && <span aria-hidden="true"> *</span>}
      </label>
      {select}
      {errorMessage ? (
        <p id={`${id}-error`} className={errorClass}>
          {errorMessage}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={hintClass}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
