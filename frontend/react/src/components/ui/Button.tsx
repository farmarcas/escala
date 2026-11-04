import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

const buttonVariant = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary:
    'border border-border bg-surface text-secondary-foreground hover:border-primary hover:text-primary',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
  'danger-outline':
    'border border-destructive-border bg-surface text-destructive-text hover:bg-destructive-soft',
  ghost: 'text-secondary-foreground hover:bg-subtle',
  link: 'px-0 text-primary hover:text-primary-hover',
} as const;

const buttonSize = {
  md: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-[13px]',
} as const;

// Aceita os atributos nativos de <button> (onClick, disabled, aria-*, form...).
export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: keyof typeof buttonVariant;
  size?: keyof typeof buttonSize;
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold',
        'transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        buttonSize[size],
        buttonVariant[variant],
        variant === 'link' && 'h-auto',
        className,
      )}
      {...props}
    />
  );
}
