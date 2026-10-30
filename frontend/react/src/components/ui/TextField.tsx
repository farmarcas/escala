import { useId, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';
import { controlClass, errorClass, hintClass, labelClass } from './fieldStyles';

export type TextFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'id'> & {
  label: string;
  hint?: string;
  errorMessage?: string;
  isRequired?: boolean;
};

export function TextField({
  label,
  hint,
  errorMessage,
  isRequired = false,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const describedBy = errorMessage ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {isRequired && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        required={isRequired}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={describedBy}
        className={cn(controlClass, 'h-12')}
        {...inputProps}
      />
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
