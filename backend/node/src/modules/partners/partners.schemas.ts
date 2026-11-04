import { z } from 'zod';
import { onlyDigits } from '../../shared/br/cnpj.js';
import {
  paginationShape,
  requestSchema,
  searchQuery,
  uuidParam,
} from '../../shared/http/request-schemas.js';
import { listOf } from '../../shared/http/list-filters.js';
import { cnpjSchema } from '../economic-groups/economic-groups.schemas.js';

export const partnerTypeSchema = z.enum(['INDUSTRY', 'DISTRIBUTOR']);
export type PartnerTypeValue = z.infer<typeof partnerTypeSchema>;

export const partnerStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type PartnerStatusValue = z.infer<typeof partnerStatusSchema>;

const partnerFields = {
  type: partnerTypeSchema,
  cnpj: cnpjSchema,
  legalName: z.string().trim().min(2).max(160),
  tradeName: z.string().trim().min(2).max(120),
};

export const createPartnerSchema = z.object(partnerFields).strict();
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;

export const updatePartnerSchema = z
  .object({
    type: partnerFields.type.optional(),
    cnpj: partnerFields.cnpj.optional(),
    legalName: partnerFields.legalName.optional(),
    tradeName: partnerFields.tradeName.optional(),
  })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo',
  });
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;

export const partnerStatusChangeSchema = z
  .object({
    action: z.enum(['inactivate', 'reactivate']),
    justification: z.string().trim().min(5, 'Explique o motivo').max(500),
  })
  .strict();
export type PartnerStatusChangeInput = z.infer<typeof partnerStatusChangeSchema>;

// Campos opcionais do contato: vazio vira "sem valor".
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const contactEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value || null)
  .pipe(z.string().email('E-mail inválido').nullable())
  .nullable()
  .optional();

const contactPhone = z
  .string()
  .transform(onlyDigits)
  .pipe(z.string().regex(/^(\d{10,11})?$/, 'Telefone deve ter DDD e 8 ou 9 dígitos'))
  .transform((value) => value || null)
  .nullable()
  .optional();

const contactShape = {
  name: z.string().trim().min(3).max(120),
  jobTitle: optionalText(80),
  email: contactEmail,
  phone: contactPhone,
  isPrimary: z.boolean().optional(),
};

// Contato precisa de pelo menos um jeito de falar com ele (spec 003, data-model).
export const createContactSchema = z
  .object(contactShape)
  .strict()
  .refine((input) => Boolean(input.email || input.phone), {
    message: 'Informe e-mail ou telefone',
    path: ['email'],
  });
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = z
  .object({ ...contactShape, name: contactShape.name.optional() })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo',
  });
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const listPartnersQuery = z
  .object({
    ...paginationShape,
    // "+ Filtro": cada campo aceita vários valores separados por vírgula.
    type: listOf(partnerTypeSchema.options),
    status: listOf(partnerStatusSchema.options),
    search: searchQuery,
  })
  .strict();
export type ListPartnersQuery = z.infer<typeof listPartnersQuery>;
export type PartnerFilter = Omit<ListPartnersQuery, 'page' | 'pageSize'>;

const contactParams = z.object({ id: z.string().uuid(), contactId: z.string().uuid() }).strict();

export const listPartnersRequest = requestSchema({ query: listPartnersQuery });
export const PARTNER_FACET_FIELDS = ['type', 'status'] as const;
export type PartnerFacetField = (typeof PARTNER_FACET_FIELDS)[number];
export const partnerFacetsRequest = requestSchema({
  query: listPartnersQuery.extend({ field: z.enum(PARTNER_FACET_FIELDS) }),
});
export const partnerStatsRequest = requestSchema({});
export const getPartnerRequest = requestSchema({ params: uuidParam });
export const createPartnerRequest = requestSchema({ body: createPartnerSchema });
export const updatePartnerRequest = requestSchema({ body: updatePartnerSchema, params: uuidParam });
export const partnerStatusRequest = requestSchema({
  body: partnerStatusChangeSchema,
  params: uuidParam,
});
export const createContactRequest = requestSchema({ body: createContactSchema, params: uuidParam });
export const updateContactRequest = requestSchema({
  body: updateContactSchema,
  params: contactParams,
});
export const deleteContactRequest = requestSchema({ params: contactParams });
export const partnerAuditRequest = requestSchema({
  params: uuidParam,
  query: z.object(paginationShape).strict(),
});
