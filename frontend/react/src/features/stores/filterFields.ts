import type { FieldValues, FilterField } from './hooks/useStores';

// Campos do "+ Filtro", na ordem e nos grupos do protótipo (Lojas Lista).
export const FILTER_GROUPS: { title: string; fields: FilterField[] }[] = [
  { title: 'Cadastro', fields: ['brandId', 'uf', 'angelId'] },
  { title: 'Situação', fields: ['stage', 'status', 'blocked'] },
  { title: 'Governança', fields: ['completeness', 'validation', 'alert'] },
];

export const FIELD_LABEL: Record<FilterField, string> = {
  brandId: 'Bandeira',
  uf: 'UF',
  angelId: 'Anjo',
  stage: 'Status',
  status: 'Situação',
  blocked: 'Bloqueio',
  completeness: 'Cadastro',
  validation: 'Validação',
  alert: 'Alerta',
};

// Nomes dos valores fixos; bandeira e Anjo vêm das listas de marcas e funcionários.
const FIXED_LABELS: Partial<Record<FilterField, Record<string, string>>> = {
  stage: { PROSPECTING: 'Prospecção', SETUP: 'Montagem', OPENED: 'Inaugurada' },
  status: {
    ACTIVE: 'Ativa',
    PENDING: 'Pendente no grupo',
    INACTIVE: 'Inativa',
    OPERATING: 'Em operação',
  },
  blocked: { false: 'Desbloqueada', true: 'Bloqueada' },
  completeness: { complete: 'Completo', partial: 'Falta algo', low: 'Falta muito' },
  validation: {
    ok: 'Em dia',
    due_soon: 'A vencer',
    overdue: 'Vencida',
    never: 'Nunca validada',
    attention: 'Vencida ou nunca feita',
  },
  alert: {
    doc: 'Documento vencido ou a vencer',
    outdated: 'Dados desatualizados (+90 dias)',
    request: 'Solicitação em andamento',
  },
};

export type ValueLabels = { brands: Map<string, string>; angels: Map<string, string> };

export function valueLabel(field: FilterField, value: string, labels: ValueLabels): string {
  if (field === 'brandId') return labels.brands.get(value) ?? 'Marca';
  if (field === 'angelId')
    return value === 'NONE' ? 'Sem Anjo' : (labels.angels.get(value) ?? 'Anjo');
  return FIXED_LABELS[field]?.[value] ?? value;
}

// Atalhos do protótipo. "Minha carteira" depende do Anjo logado, que chega com o login.
export const SHORTCUTS: { label: string; preset: FieldValues | null; hint?: string }[] = [
  {
    label: 'Minha carteira',
    preset: null,
    hint: 'Disponível com o login: as lojas em que você é Anjo',
  },
  { label: 'Cadastro incompleto', preset: { completeness: ['partial', 'low'] } },
  { label: 'Validação vencida', preset: { validation: ['overdue'] } },
  { label: 'Com alerta', preset: { alert: ['doc', 'outdated', 'request'] } },
];
