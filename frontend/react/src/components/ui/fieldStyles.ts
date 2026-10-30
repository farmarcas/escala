// Classes compartilhadas pelos controles de formulário (input, select, textarea).
// Foco: a borda vira 2px da cor de ação, sem anel externo (Alquimia DS).
export const controlClass =
  'w-full rounded-md border border-border bg-surface px-3.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground transition-colors duration-150 ' +
  'focus:border-2 focus:border-primary focus:px-[13px] focus:outline-none ' +
  'disabled:bg-subtle disabled:text-secondary-foreground ' +
  'aria-invalid:border-destructive';

export const labelClass = 'mb-1.5 block text-xs font-medium text-secondary-foreground';
export const hintClass = 'mt-1.5 text-xs text-muted-foreground';
export const errorClass = 'mt-1.5 text-xs text-destructive-text';
