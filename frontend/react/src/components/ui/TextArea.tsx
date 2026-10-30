import { useId, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';
import { controlClass, errorClass, labelClass } from './fieldStyles';

export type TextAreaProps = Omit<ComponentPropsWithoutRef<'textarea'>, 'id'> & {
  label: string;
  errorMessage?: string;
  isRequired?: boolean;
};

export function TextArea({
  label,
  errorMessage,
  isRequired = false,
  className,
  ...textareaProps
}: TextAreaProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {isRequired && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={id}
        required={isRequired}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? `${id}-error` : undefined}
        className={cn(controlClass, 'min-h-24 py-3 focus:py-[11px]')}
        {...textareaProps}
      />
      {errorMessage && (
        <p id={`${id}-error`} className={errorClass}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
