import { z } from 'zod';
import { isValidCnpj, onlyDigits } from '../../shared/br/cnpj.js';
import { isValidCpf } from '../../shared/br/cpf.js';
import { UFS } from '../../shared/br/uf.js';
import { angelListOf, listOf, uuidListOf } from '../../shared/http/list-filters.js';
import { paginationShape, requestSchema, searchQuery } from '../../shared/http/request-schemas.js';

export const GROUP_STATUSES = ['ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const;
export const groupStatusSchema = z.enum(GROUP_STATUSES);
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
    // "+ Filtro": cada campo aceita vários valores separados por vírgula.
    status: listOf(GROUP_STATUSES),
    search: searchQuery,
    uf: listOf(UFS),
    brandId: uuidListOf(),
    angelId: angelListOf(),
    // Link antigo "Sem Anjo" (indicador de Funcionários); o mesmo que angelId=NONE.
    withoutAngel: z.enum(['true']).optional(),
  })
  .strict();
export type ListGroupsQuery = z.infer<typeof listGroupsQuery>;

export const GROUP_FACET_FIELDS = ['status', 'uf', 'brandId', 'angelId'] as const;
export type GroupFacetField = (typeof GROUP_FACET_FIELDS)[number];

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

// Transferir a titularidade (spec 003, US5): nova pessoa + justificativa.
export const ownerTransferSchema = ownerSchema
  .extend({ justification: z.string().trim().min(5, 'Explique o motivo').max(500) })
  .strict();
export type OwnerTransferInput = z.infer<typeof ownerTransferSchema>;

// Cartão Alelo (spec 003, US6). CPF, nascimento e número são dados pessoais.
export const benefitCardSchema = z
  .object({
    holderName: z.string().trim().min(3).max(120),
    holderCpf: z.string().transform(onlyDigits).refine(isValidCpf, { message: 'CPF inválido' }),
    holderBirthDate: z.iso.date().refine((value) => value < new Date().toISOString().slice(0, 10), {
      message: 'A data de nascimento precisa estar no passado',
    }),
    cardNumber: z
      .string()
      .transform(onlyDigits)
      .pipe(z.string().regex(/^\d{13,19}$/, 'O número do cartão tem de 13 a 19 dígitos')),
    storeCode: z.number().int().positive(),
  })
  .strict();
export type BenefitCardInput = z.infer<typeof benefitCardSchema>;

export const listGroupsRequest = requestSchema({ query: listGroupsQuery });
export const groupFacetsRequest = requestSchema({
  query: listGroupsQuery.extend({ field: z.enum(GROUP_FACET_FIELDS) }),
});
export const ownerTransferRequest = requestSchema({
  body: ownerTransferSchema,
  params: groupNumberParam,
});
export const benefitCardRequest = requestSchema({
  body: benefitCardSchema,
  params: groupNumberParam,
});
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
