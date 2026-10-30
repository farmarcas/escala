import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useMutation } from '@/hooks/useMutation';

type BrandCreateFormProps = { onCreate: (name: string) => Promise<void> };

export function BrandCreateForm({ onCreate }: BrandCreateFormProps) {
  const [name, setName] = useState('');
  const { run, isPending, error } = useMutation();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => onCreate(name.trim()))) setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-start gap-2">
      <div className="min-w-[220px] flex-1 sm:max-w-sm">
        <label htmlFor="new-brand" className="sr-only">
          Nome da nova marca
        </label>
        <input
          id="new-brand"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome da nova marca"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'new-brand-error' : undefined}
          className="h-10 w-full rounded-md border border-border bg-surface px-3.5 text-sm placeholder:text-muted-foreground focus:border-2 focus:border-primary focus:px-[13px] focus:outline-none aria-invalid:border-destructive"
        />
        {error && (
          <p id="new-brand-error" className="mt-1.5 text-xs text-destructive-text">
            {error.code === 'VALIDATION_ERROR' ? 'Use de 2 a 60 caracteres.' : error.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending || name.trim().length < 2}>
        Adicionar
      </Button>
    </form>
  );
}
