import { z } from 'zod';
import { UFS } from '../../shared/br/uf.js';
import {
  paginationShape,
  requestSchema,
  searchQuery,
  uuidParam,
} from '../../shared/http/request-schemas.js';
import { cnpjSchema, groupNumberParam } from '../economic-groups/economic-groups.schemas.js';

export const storeTypeSchema = z.enum(['PDV', 'CD']);
export const storeStatusSchema = z.enum(['PENDING', 'ACTIVE', 'INACTIVE']);
export const storeStageSchema = z.enum(['PROSPECTING', 'SETUP', 'OPENED']);
export type StoreTypeValue = z.infer<typeof storeTypeSchema>;
export type StoreStatusValue = z.infer<typeof storeStatusSchema>;

export const createStoreSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    type: storeTypeSchema,
    cnpj: cnpjSchema,
    brandId: z.string().uuid(),
    street: z.string().trim().min(3).max(200),
    number: z.string().trim().min(1).max(20),
    district: z.string().trim().min(2).max(80),
    zip: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .pipe(z.string().regex(/^\d{8}$/, 'O CEP tem 8 dígitos'))
      .optional(),
    city: z.string().trim().min(2).max(80),
    uf: z.enum(UFS),
    openedAt: z.iso.date().optional(),
    // Loja nova nasce em Prospecção, a não ser que o administrador escolha outra etapa.
    stage: storeStageSchema.optional(),
  })
  .strict();
export type CreateStoreInput = z.infer<typeof createStoreSchema>;

// Mudar o status da loja pede justificativa, que vai para a auditoria do grupo.
export const updateStoreSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
    justification: z.string().trim().min(5, 'Explique o motivo').max(500),
  })
  .strict();
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

const reason = z.string().trim().min(5, 'Explique o motivo').max(500);

// Etapa (spec 003, FR-040): a regra de data e de justificativa fica em stage.ts.
export const stageChangeSchema = z
  .object({
    stage: storeStageSchema,
    openedAt: z.iso.date().optional(),
    justification: reason.optional(),
  })
  .strict();
export type StageChangeInput = z.infer<typeof stageChangeSchema>;

export const blockChangeSchema = z.object({ justification: reason }).strict();

// Ações em lote na lista de lojas (spec 003, US7). Bloquear e desbloquear pedem motivo;
// cobrar o preenchimento e a validação, não.
export const bulkBlockSchema = z
  .object({
    action: z.enum(['BLOCK', 'UNBLOCK', 'REMIND']),
    codes: z.array(z.number().int().positive()).min(1).max(200),
    justification: reason.optional(),
  })
  .strict()
  .refine((input) => input.action === 'REMIND' || Boolean(input.justification), {
    message: 'Explique o motivo',
    path: ['justification'],
  });
export type BulkBlockInput = z.infer<typeof bulkBlockSchema>;

const storeCodeParam = z.object({ code: z.coerce.number().int().positive() }).strict();

const storeFilters = {
  search: searchQuery,
  type: storeTypeSchema.optional(),
};

export const listGroupStoresQuery = z.object({ ...paginationShape, ...storeFilters }).strict();

// Filtro de vários valores (protótipo "+ Filtro"): "SP,MG" vira ["SP", "MG"]; os valores de um
// mesmo campo somam (ou), e campos diferentes se combinam (e).
const splitList = (value: string) => value.split(',').filter(Boolean);
const listOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform(splitList)
    .pipe(z.array(z.enum(values)).min(1).max(50))
    .optional();

export const NO_ANGEL = 'NONE';
export const STORE_ALERTS = ['doc', 'outdated', 'request'] as const;

export const storeFilterShape = {
  brandId: z
    .string()
    .transform(splitList)
    .pipe(z.array(z.string().uuid()).min(1).max(50))
    .optional(),
  // Ids de funcionário; NONE = grupo sem Anjo.
  angelId: z
    .string()
    .transform(splitList)
    .pipe(
      z
        .array(z.union([z.string().uuid(), z.literal(NO_ANGEL)]))
        .min(1)
        .max(50),
    )
    .optional(),
  uf: listOf(UFS),
  // OPERATING = rede em operação, a mesma conta do Início: ativa ou pendente, de grupo não arquivado.
  status: listOf(['PENDING', 'ACTIVE', 'INACTIVE', 'OPERATING'] as const),
  completeness: listOf(['complete', 'partial', 'low']),
  validation: listOf(['ok', 'due_soon', 'overdue', 'never', 'attention']),
  stage: listOf(['PROSPECTING', 'SETUP', 'OPENED'] as const),
  blocked: listOf(['true', 'false']),
  // Alerta: documento vencido ou a vencer, dados desatualizados (+90 dias), solicitação aberta.
  alert: listOf([...STORE_ALERTS]),
};

export const listStoresQuery = z
  .object({
    ...paginationShape,
    ...storeFilters,
    ...storeFilterShape,
    hasOpenRequest: z.enum(['true']).optional(),
    // Documento vencido ou vencendo em até 30 dias.
    docAlert: z.enum(['true']).optional(),
    // Loja em operação sem mudança nem validação há mais de 90 dias.
    outdated: z.enum(['true']).optional(),
    // "Exportar selecionadas": códigos separados por vírgula (até 200).
    codes: z
      .string()
      .regex(/^\d+(,\d+){0,199}$/, 'Informe os códigos separados por vírgula')
      .transform((value) => value.split(',').map(Number))
      .optional(),
  })
  .strict();
export type ListStoresQuery = z.infer<typeof listStoresQuery>;
export type StoreFilter = Omit<ListStoresQuery, 'page' | 'pageSize'> & { groupId?: string };

export const listStoresRequest = requestSchema({ query: listStoresQuery });

// Quantas lojas há em cada opção de um campo, com os outros filtros aplicados.
export const FACET_FIELDS = [
  'brandId',
  'uf',
  'angelId',
  'stage',
  'status',
  'blocked',
  'completeness',
  'validation',
  'alert',
] as const;
export type FacetField = (typeof FACET_FIELDS)[number];
export const storeFacetsRequest = requestSchema({
  query: listStoresQuery.extend({ field: z.enum(FACET_FIELDS) }),
});
export const storeStatsRequest = requestSchema({});
export const updateStoreRequest = requestSchema({ body: updateStoreSchema, params: uuidParam });
export const stageChangeRequest = requestSchema({
  body: stageChangeSchema,
  params: storeCodeParam,
});
export const blockChangeRequest = requestSchema({
  body: blockChangeSchema,
  params: storeCodeParam,
});
export const bulkBlockRequest = requestSchema({ body: bulkBlockSchema });
export const listGroupStoresRequest = requestSchema({
  params: groupNumberParam,
  query: listGroupStoresQuery,
});
export const createGroupStoreRequest = requestSchema({
  params: groupNumberParam,
  body: createStoreSchema,
});
