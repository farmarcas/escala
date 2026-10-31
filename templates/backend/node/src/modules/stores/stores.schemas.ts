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

const storeCodeParam = z.object({ code: z.coerce.number().int().positive() }).strict();

const storeFilters = {
  search: searchQuery,
  type: storeTypeSchema.optional(),
};

export const listGroupStoresQuery = z.object({ ...paginationShape, ...storeFilters }).strict();

export const listStoresQuery = z
  .object({
    ...paginationShape,
    ...storeFilters,
    brandId: z.string().uuid().optional(),
    angelId: z.string().uuid().optional(),
    uf: z.enum(UFS).optional(),
    // OPERATING = rede em operação, a mesma conta do Início: ativa ou pendente, de grupo não arquivado.
    status: z.enum([...storeStatusSchema.options, 'OPERATING']).optional(),
    completeness: z.enum(['complete', 'partial', 'low']).optional(),
    validation: z.enum(['ok', 'due_soon', 'overdue', 'never', 'attention']).optional(),
    hasOpenRequest: z.enum(['true']).optional(),
    // Documento vencido ou vencendo em até 30 dias.
    docAlert: z.enum(['true']).optional(),
    // Loja em operação sem mudança nem validação há mais de 90 dias.
    outdated: z.enum(['true']).optional(),
    stage: storeStageSchema.optional(),
    blocked: z.enum(['true', 'false']).optional(),
  })
  .strict();
export type ListStoresQuery = z.infer<typeof listStoresQuery>;
export type StoreFilter = Omit<ListStoresQuery, 'page' | 'pageSize'> & { groupId?: string };

export const listStoresRequest = requestSchema({ query: listStoresQuery });
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
export const listGroupStoresRequest = requestSchema({
  params: groupNumberParam,
  query: listGroupStoresQuery,
});
export const createGroupStoreRequest = requestSchema({
  params: groupNumberParam,
  body: createStoreSchema,
});
