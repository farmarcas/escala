import type { BadgeTone } from '@/components/ui/StatusBadge';

// Rótulos da governança da loja (preenchimento e validação semestral), usados nas listas e na página.
export type ValidationStatus = 'never' | 'ok' | 'due_soon' | 'overdue';

export function validationLabel(
  status: ValidationStatus,
  days: number | null,
): { text: string; tone: BadgeTone } {
  if (status === 'never') return { text: 'Nunca validada', tone: 'danger' };
  if (status === 'overdue')
    return { text: `Vencida há ${Math.abs(days ?? 0)} dias`, tone: 'danger' };
  if (status === 'due_soon') return { text: `Vence em ${days ?? 0} dias`, tone: 'warning' };
  return { text: 'Em dia', tone: 'success' };
}

export function completenessPercent(filled: number, total: number): number {
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

export function completenessText(filled: number, total: number): string {
  const missing = total - filled;
  if (total === 0) return 'Ainda não calculado';
  if (missing === 0) return 'Tudo preenchido';
  return `${missing} ${missing === 1 ? 'campo vazio' : 'campos vazios'}`;
}
