import { formatPhone } from '@/lib/format';
import type { Owner } from '../types';

type OwnerSummaryProps = { owner: Owner | null };

// Admin vê nome e e-mail; analista vê o código pseudonimizado.
export function OwnerSummary({ owner }: OwnerSummaryProps) {
  if (!owner) {
    return (
      <div className="min-w-0">
        <p className="truncate text-destructive">Não cadastrado</p>
        <p className="truncate text-xs text-muted-foreground">Cadastre em Editar grupo</p>
      </div>
    );
  }
  if (!owner.name) {
    return (
      <div className="min-w-0">
        <p className="truncate font-mono text-[13px]">{owner.pseudonym}</p>
        <p className="truncate text-xs text-muted-foreground">Proprietário · pseudonimizado</p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="truncate">{owner.name}</p>
      <p className="truncate text-xs text-muted-foreground">{owner.email}</p>
    </div>
  );
}

export function ownerPhoneLabel(owner: Owner | null): { text: string; isMuted: boolean } {
  if (!owner) return { text: '—', isMuted: true };
  if (!owner.phone) return { text: 'Pseudonimizado', isMuted: true };
  return { text: formatPhone(owner.phone), isMuted: false };
}
