import { z } from 'zod';
import { UFS } from '../../../shared/br/uf.js';
import { cnpjSchema } from '../../economic-groups/economic-groups.schemas.js';
import type { StepOwner } from '../permissions.js';

// Os 4 tipos de solicitação de mudança em dado sensível (spec 002, US3).
// Etapas e documentos mudam só aqui, em código revisado.

export type RequestType = 'CNPJ' | 'ADDRESS' | 'BRAND' | 'TAX_REGIME';

export type Step = {
  label: string;
  owner: StepOwner;
  // Só avança com todos os documentos exigidos anexados.
  requiresDocuments?: boolean;
  // O grupo pode contestar nesta etapa (ex.: ciência de troca de bandeira).
  allowsContest?: boolean;
};

const zip = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .pipe(z.string().regex(/^\d{8}$/, 'O CEP tem 8 dígitos'));

export const REQUEST_VALUES = {
  CNPJ: z
    .object({
      cnpj: cnpjSchema,
      legalName: z.string().trim().min(2).max(160),
      stateRegistration: z.string().trim().min(1).max(30),
    })
    .strict(),
  ADDRESS: z
    .object({
      zip,
      street: z.string().trim().min(3).max(200),
      number: z.string().trim().min(1).max(20),
      district: z.string().trim().min(2).max(80),
      city: z.string().trim().min(2).max(80),
      uf: z.enum(UFS),
    })
    .strict(),
  BRAND: z.object({ brandId: z.string().uuid() }).strict(),
  TAX_REGIME: z.object({ taxRegime: z.enum(['SIMPLES', 'PRESUMIDO', 'REAL']) }).strict(),
} as const;

export type RequestValues = {
  [K in RequestType]: z.infer<(typeof REQUEST_VALUES)[K]>;
};

export type RequestDefinition = {
  title: string;
  description: string;
  steps: Step[];
  documents: string[];
  effect: string;
};

export const REQUEST_TYPES: Record<RequestType, RequestDefinition> = {
  CNPJ: {
    title: 'Mudança de CNPJ',
    description: 'Troca de CNPJ, razão social ou inscrição estadual',
    steps: [
      { label: 'Solicitação', owner: 'any' },
      { label: 'Validação na Receita', owner: 'system' },
      { label: 'Análise de documentos', owner: 'platform', requiresDocuments: true },
      { label: 'Atualização nos sistemas', owner: 'platform' },
      { label: 'Vigente', owner: 'end' },
    ],
    documents: ['CNPJ_CARD', 'ARTICLES'],
    effect: 'O CNPJ atual vai para o histórico e a loja passa a usar o novo.',
  },
  ADDRESS: {
    title: 'Mudança de endereço',
    description: 'Endereço registrado na Receita',
    steps: [
      { label: 'Solicitação', owner: 'any' },
      { label: 'Envio de documentos', owner: 'group', requiresDocuments: true },
      { label: 'Análise Farmarcas', owner: 'platform' },
      { label: 'Vistoria da nova loja', owner: 'platform' },
      { label: 'Vigente', owner: 'end' },
    ],
    documents: ['ADDRESS_PROOF', 'OPERATING_PERMIT', 'SANITARY_LICENSE'],
    effect: 'Troca o endereço da Receita. Mudança de UF exige nova inscrição estadual.',
  },
  BRAND: {
    title: 'Troca de bandeira',
    description: 'Marca Farmarcas da loja',
    steps: [
      { label: 'Pedido', owner: 'any' },
      { label: 'Comitê de marcas', owner: 'platform' },
      { label: 'Ciência do grupo', owner: 'group', allowsContest: true },
      { label: 'Implantação da fachada', owner: 'group' },
      { label: 'Vigente', owner: 'end' },
    ],
    documents: [],
    effect: 'Muda a marca da loja em Grupos econômicos e Marcas Farmarcas.',
  },
  TAX_REGIME: {
    title: 'Mudança de regime tributário',
    description: 'Simples, Presumido ou Real',
    steps: [
      { label: 'Solicitação', owner: 'any' },
      { label: 'Análise contábil', owner: 'platform', requiresDocuments: true },
      { label: 'Vigente', owner: 'end' },
    ],
    documents: ['OPTION_TERM'],
    effect: 'Muda os encargos usados no módulo Escala.',
  },
};

export const TAX_REGIME_LABELS: Record<string, string> = {
  SIMPLES: 'Simples Nacional',
  PRESUMIDO: 'Lucro Presumido',
  REAL: 'Lucro Real',
};
