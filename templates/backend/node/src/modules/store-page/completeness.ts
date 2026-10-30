import { BASIC_FIELDS, BASIC_FIELD_KEYS, DOCUMENT_LABELS, REQUIRED_DOCUMENTS } from './fields.js';

// Preenchimento do cadastro (US4): os 30 itens que o grupo preenche — dados básicos, endereço
// popular, estrutura, horário, serviços, sistema, PBMs, estratégias e documentos obrigatórios.

export type CompletenessInput = {
  basic: Partial<Record<string, string | null>>;
  documentTypes: string[];
  structure?: {
    areaM2: number | null;
    salesAreaM2: number | null;
    staffCount: number | null;
    demandSystemId: string | null;
  };
  hasOpeningHours?: boolean;
  serviceCount?: number;
  pbmCount?: number;
  strategyCount?: number;
};

export type Completeness = { filled: number; total: number; missing: string[] };

const isFilled = (value: string | null | undefined) =>
  value !== null && value !== undefined && String(value).trim() !== '';

export const computeCompleteness = (input: CompletenessInput): Completeness => {
  const items: [string, boolean][] = [];
  for (const key of BASIC_FIELD_KEYS) {
    const field = BASIC_FIELDS[key];
    if (field.countsForCompleteness) items.push([field.label, isFilled(input.basic[key])]);
  }
  const structure = input.structure;
  items.push(
    ['Área da loja', structure?.areaM2 != null],
    ['Área de venda', structure?.salesAreaM2 != null],
    ['Número de colaboradores', structure?.staffCount != null],
    ['Horário de funcionamento', Boolean(input.hasOpeningHours)],
    ['Serviços oferecidos', (input.serviceCount ?? 0) > 0],
    ['Sistema de demanda', Boolean(structure?.demandSystemId)],
    ['PBMs aceitos', (input.pbmCount ?? 0) > 0],
    ['Estratégias da loja', (input.strategyCount ?? 0) > 0],
  );
  for (const doc of REQUIRED_DOCUMENTS) {
    items.push([DOCUMENT_LABELS[doc] ?? doc, input.documentTypes.includes(doc)]);
  }
  const missing = items.filter(([, ok]) => !ok).map(([label]) => label);
  return { filled: items.length - missing.length, total: items.length, missing };
};

// Faixas usadas nos filtros da lista de Lojas.
export type CompletenessBand = 'complete' | 'partial' | 'low';

export const bandOf = (filled: number, total: number): CompletenessBand => {
  if (total === 0 || filled >= total) return 'complete';
  return filled * 100 >= total * 80 ? 'partial' : 'low';
};

// Validação semestral: vale 6 meses; avisa nos últimos 30 dias.
export const VALIDATION_MONTHS = 6;
export const DUE_SOON_DAYS = 30;
const DAY_MS = 86_400_000;

export type ValidationStatus = 'never' | 'ok' | 'due_soon' | 'overdue';

export const validationDueAt = (validatedAt: Date): Date => {
  const due = new Date(validatedAt);
  due.setUTCMonth(due.getUTCMonth() + VALIDATION_MONTHS);
  return due;
};

export const validationStatus = (
  validatedAt: Date | null,
  today: Date,
): { status: ValidationStatus; dueAt: Date | null; days: number | null } => {
  if (!validatedAt) return { status: 'never', dueAt: null, days: null };
  const dueAt = validationDueAt(validatedAt);
  const days = Math.ceil((dueAt.getTime() - today.getTime()) / DAY_MS);
  const status = days < 0 ? 'overdue' : days <= DUE_SOON_DAYS ? 'due_soon' : 'ok';
  return { status, dueAt, days };
};

// Status de validade de um documento.
export type DocumentStatus = 'valid' | 'due_soon' | 'expired' | 'missing';

export const documentStatus = (validUntil: Date | null, today: Date): DocumentStatus => {
  if (!validUntil) return 'valid';
  const days = Math.ceil((validUntil.getTime() - today.getTime()) / DAY_MS);
  if (days < 0) return 'expired';
  return days <= DUE_SOON_DAYS ? 'due_soon' : 'valid';
};
