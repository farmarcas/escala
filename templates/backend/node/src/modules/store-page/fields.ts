import { z } from 'zod';
import { UFS } from '../../shared/br/uf.js';

// Campos que o grupo mantém direto (camada "dados básicos"). A Farmarcas corrige com motivo.
// Identificação na Receita, bandeira e regime NÃO estão aqui: mudam só por solicitação.

const text = (max: number) => z.string().trim().max(max);
const digits = (pattern: RegExp, message: string) =>
  z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().regex(pattern, message));
const phone = digits(/^\d{10,11}$/, 'Informe DDD e número');
const zip = digits(/^\d{8}$/, 'O CEP tem 8 dígitos');

export type BasicField = {
  label: string;
  schema: z.ZodType<string>;
  // Dado pessoal do proprietário: só o grupo edita; o analista recebe mascarado.
  isOwnerPrivate?: boolean;
  // Entra na conta de preenchimento do cadastro (US4).
  countsForCompleteness: boolean;
};

export const BASIC_FIELDS = {
  name: { label: 'Apelido da loja', schema: text(120).min(2), countsForCompleteness: true },
  tradeName: { label: 'Nome fantasia', schema: text(160), countsForCompleteness: true },
  storeCategory: { label: 'Tipo de loja', schema: text(80), countsForCompleteness: true },
  affiliatedNetwork: { label: 'Rede filiada', schema: text(120), countsForCompleteness: true },
  openedAt: {
    label: 'Data de inauguração',
    schema: z.iso.date(),
    countsForCompleteness: true,
  },
  phone1: { label: 'Telefone 1', schema: phone, countsForCompleteness: true },
  phone2: { label: 'Telefone 2', schema: phone, countsForCompleteness: true },
  whatsapp: { label: 'WhatsApp', schema: phone, countsForCompleteness: true },
  deliveryPhone: { label: 'Telefone delivery', schema: phone, countsForCompleteness: true },
  email: {
    label: 'E-mail da loja',
    schema: z.string().trim().toLowerCase().email(),
    countsForCompleteness: true,
  },
  ownerMobile: {
    label: 'Celular do proprietário',
    schema: phone,
    isOwnerPrivate: true,
    countsForCompleteness: true,
  },
  ownerPersonalEmail: {
    label: 'E-mail pessoal do proprietário',
    schema: z.string().trim().toLowerCase().email(),
    isOwnerPrivate: true,
    countsForCompleteness: true,
  },
  popZip: { label: 'CEP popular', schema: zip, countsForCompleteness: true },
  popStreet: { label: 'Logradouro popular', schema: text(200), countsForCompleteness: true },
  popNumber: { label: 'Número popular', schema: text(20), countsForCompleteness: true },
  popDistrict: { label: 'Bairro popular', schema: text(80), countsForCompleteness: true },
  popComplement: { label: 'Complemento popular', schema: text(200), countsForCompleteness: false },
  popCity: { label: 'Cidade popular', schema: text(80), countsForCompleteness: true },
  popUf: { label: 'UF popular', schema: z.enum(UFS), countsForCompleteness: true },
} satisfies Record<string, BasicField>;

export type BasicFieldKey = keyof typeof BASIC_FIELDS;
export const BASIC_FIELD_KEYS = Object.keys(BASIC_FIELDS) as BasicFieldKey[];

// Campos que só mudam por solicitação (mensagem clara se alguém tentar editar direto).
export const REQUEST_ONLY_FIELDS = [
  'cnpj',
  'legalName',
  'stateRegistration',
  'zip',
  'street',
  'number',
  'district',
  'city',
  'uf',
  'brandId',
  'taxRegime',
] as const;

// Documentos que contam no preenchimento do cadastro.
export const REQUIRED_DOCUMENTS = ['OPERATING_PERMIT', 'SANITARY_LICENSE', 'AFE', 'CRF'] as const;

export const DOCUMENT_LABELS: Record<string, string> = {
  CNPJ_CARD: 'Cartão CNPJ',
  OPERATING_PERMIT: 'Alvará de funcionamento',
  SANITARY_LICENSE: 'Licença sanitária',
  AFE: 'AFE Anvisa',
  CRF: 'Certidão de regularidade (CRF)',
  ASSOCIATION_CONTRACT: 'Contrato de associação Farmarcas',
  ADDRESS_PROOF: 'Comprovante do novo endereço',
  ARTICLES: 'Contrato social ou alteração contratual',
  OPTION_TERM: 'Termo de opção',
};
