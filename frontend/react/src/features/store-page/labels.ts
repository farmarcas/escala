import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { BasicKey } from './types';

export const TAX_REGIME_LABEL: Record<string, string> = {
  SIMPLES: 'Simples Nacional',
  PRESUMIDO: 'Lucro Presumido',
  REAL: 'Lucro Real',
};

export const STORE_STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  INACTIVE: { label: 'Inativa', tone: 'neutral' },
  PENDING: { label: 'Pendente no grupo', tone: 'warning' },
};

export { validationLabel } from '@/lib/governance';

// Como cada campo básico é mostrado e digitado.
export type FieldKind = 'text' | 'phone' | 'zip' | 'date' | 'email' | 'uf';

export const BASIC_FIELD_UI: Record<
  BasicKey,
  { label: string; kind: FieldKind; hint?: string; isOwnerPrivate?: boolean }
> = {
  name: {
    label: 'Apelido da loja',
    kind: 'text',
    hint: 'Nome do dia a dia, diferente da razão social',
  },
  tradeName: { label: 'Nome fantasia', kind: 'text' },
  storeCategory: { label: 'Tipo de loja', kind: 'text' },
  affiliatedNetwork: { label: 'Rede filiada', kind: 'text' },
  openedAt: { label: 'Data de inauguração', kind: 'date' },
  phone1: { label: 'Telefone 1', kind: 'phone' },
  phone2: { label: 'Telefone 2', kind: 'phone' },
  whatsapp: { label: 'WhatsApp', kind: 'phone' },
  deliveryPhone: { label: 'Telefone delivery', kind: 'phone' },
  email: { label: 'E-mail da loja', kind: 'email' },
  ownerMobile: { label: 'Celular do proprietário', kind: 'phone', isOwnerPrivate: true },
  ownerPersonalEmail: {
    label: 'E-mail pessoal do proprietário',
    kind: 'email',
    isOwnerPrivate: true,
  },
  popZip: { label: 'CEP', kind: 'zip' },
  popStreet: { label: 'Logradouro', kind: 'text' },
  popNumber: { label: 'Número', kind: 'text' },
  popDistrict: { label: 'Bairro', kind: 'text' },
  popComplement: { label: 'Complemento', kind: 'text' },
  popCity: { label: 'Cidade', kind: 'text' },
  popUf: { label: 'UF', kind: 'uf' },
};
