import { z } from 'zod';
import { isValidCnpj, onlyDigits } from '../../shared/br/cnpj.js';
import { UFS } from '../../shared/br/uf.js';
import { paginationShape, requestSchema, searchQuery } from '../../shared/http/request-schemas.js';

export const groupStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']);
export type GroupStatusValue = z.infer<typeof groupStatusSchema>;

export const cnpjSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCnpj, { message: 'CNPJ inválido' });

const phoneSchema = z
  .string()
  .transform(onlyDigits)
  .pipe(z.string().regex(/^\d{10,11}$/, 'Telefone deve ter DDD e 8 ou 9 dígitos'));

export const ownerSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    email: z.string().trim().toLowerCase().email(),
    phone: phoneSchema,
  })
  .strict();
export type OwnerInput = z.infer<typeof ownerSchema>;

const groupFields = {
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().min(2).max(160),
  cnpj: cnpjSchema,
};

// `number` não é aceito: é emitido pelo sistema e nunca muda (.strict() recusa).
export const createGroupSchema = z
  .object({ ...groupFields, owner: ownerSchema.optional() })
  .strict();
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z
  .object({
    name: groupFields.name.optional(),
    legalName: groupFields.legalName.optional(),
    cnpj: groupFields.cnpj.optional(),
    owner: ownerSchema.optional(),
  })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo',
  });
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const statusActionSchema = z.enum(['suspend', 'archive', 'restore']);
export type StatusAction = z.infer<typeof statusActionSchema>;

export const statusChangeSchema = z
  .object({
    action: statusActionSchema,
    justification: z.string().trim().min(1, 'Justificativa obrigatória').max(1000),
  })
  .strict();
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

export const groupNumberParam = z.object({ number: z.coerce.number().int().positive() }).strict();

export const listGroupsQuery = z
  .object({
    ...paginationShape,
    status: groupStatusSchema.optional(),
    search: searchQuery,
    uf: z.enum(UFS).optional(),
    brandId: z.string().uuid().optional(),
    angelId: z.string().uuid().optional(),
    withoutAngel: z.enum(['true']).optional(),
  })
  .strict();
export type ListGroupsQuery = z.infer<typeof listGroupsQuery>;

// Anjo do grupo (spec 003, US2): null retira o Anjo.
export const setAngelSchema = z.object({ employeeId: z.string().uuid().nullable() }).strict();
export type SetAngelInput = z.infer<typeof setAngelSchema>;

export const bulkAngelSchema = z
  .object({
    numbers: z.array(z.number().int().positive()).min(1).max(200),
    employeeId: z.string().uuid(),
  })
  .strict();
export type BulkAngelInput = z.infer<typeof bulkAngelSchema>;

export const listGroupsRequest = requestSchema({ query: listGroupsQuery });
export const setAngelRequest = requestSchema({ body: setAngelSchema, params: groupNumberParam });
export const bulkAngelRequest = requestSchema({ body: bulkAngelSchema });
export const groupStatsRequest = requestSchema({});
export const createGroupRequest = requestSchema({ body: createGroupSchema });
export const getGroupRequest = requestSchema({ params: groupNumberParam });
export const updateGroupRequest = requestSchema({
  body: updateGroupSchema,
  params: groupNumberParam,
});
export const statusChangeRequest = requestSchema({
  body: statusChangeSchema,
  params: groupNumberParam,
});
export const listGroupAuditRequest = requestSchema({
  params: groupNumberParam,
  query: z.object(paginationShape).strict(),
});
