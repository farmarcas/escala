import { z } from 'zod';
import { paginationShape, requestSchema, searchQuery } from '../../shared/http/request-schemas.js';
import {
  CATALOG_SLUGS,
  CHANNEL_TYPES,
  FURNITURE_TYPES,
  type CatalogSlug,
} from './catalog-kinds.js';
import { FURNITURE_ICON_KEYS } from './furniture-icons.js';

// Texto opcional: vazio vira "sem valor".
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const name = z.string().trim().min(1, 'Informe o nome').max(80, 'Até 80 caracteres');
const description = optionalText(200);

// Campos de cada lista (data-model.md, "Campos por lista"). Campo de outra lista é recusado.
const FIELDS = {
  furniture: {
    name,
    description,
    groupLabel: z.enum(FURNITURE_TYPES, { message: 'Escolha o tipo' }),
    icon: z.enum(FURNITURE_ICON_KEYS, { message: 'Escolha um ícone da galeria' }),
    selfService: z.boolean(),
  },
  services: { name },
  'demand-systems': { name },
  'practice-tools': { name },
  pbms: { name, groupLabel: optionalText(60) },
  strategies: { name, description, usedByScale: z.boolean() },
  'external-tools': {
    name,
    groupLabel: optionalText(60),
    description,
    negotiatedMonthlyCents: z.number().int().min(0, 'Valor não pode ser negativo').nullable(),
  },
  channels: {
    name,
    groupLabel: z.enum(CHANNEL_TYPES, { message: 'Escolha próprio ou de terceiro' }),
    description: z.string().trim().min(1, 'Informe o que a loja preenche').max(200),
  },
  departments: { name },
  occupations: { name },
} satisfies Record<CatalogSlug, z.ZodRawShape>;

export type CatalogItemInput = {
  name: string;
  groupLabel?: string | null;
  description?: string | null;
  icon?: string;
  selfService?: boolean;
  usedByScale?: boolean;
  negotiatedMonthlyCents?: number | null;
};

// Inclusão: os campos da lista; os booleanos e o valor podem faltar (padrão no service).
export const createSchemaFor = (slug: CatalogSlug) => {
  const shape = FIELDS[slug] as z.ZodRawShape;
  const relaxed = Object.fromEntries(
    Object.entries(shape).map(([key, schema]) =>
      ['selfService', 'usedByScale', 'negotiatedMonthlyCents'].includes(key)
        ? [key, (schema as z.ZodType).optional()]
        : [key, schema],
    ),
  );
  return z.object(relaxed).strict() as unknown as z.ZodType<CatalogItemInput>;
};

// Alteração: qualquer campo da lista, mais a versão lida.
export const updateSchemaFor = (slug: CatalogSlug) =>
  z
    .object(FIELDS[slug] as z.ZodRawShape)
    .partial()
    .strict()
    .refine((input) => Object.values(input).some((value) => value !== undefined), {
      message: 'Informe ao menos um campo',
    }) as unknown as z.ZodType<Partial<CatalogItemInput>>;

const version = z.number().int().positive();
const kindParams = z.object({ kind: z.enum(CATALOG_SLUGS) }).strict();
const itemParams = kindParams.extend({ id: z.string().uuid() }).strict();

export const summaryRequest = requestSchema({});
export const listItemsRequest = requestSchema({
  params: kindParams,
  query: z
    .object({
      status: z.enum(['active', 'inactive', 'all']).default('active'),
      q: searchQuery,
    })
    .strict(),
});
// O corpo é conferido no service, com o esquema da lista do endereço.
export const createItemRequest = requestSchema({ params: kindParams, body: z.unknown() });
export const updateItemRequest = requestSchema({
  params: itemParams,
  body: z.object({ version }).passthrough(),
});
export const moveItemRequest = requestSchema({
  params: itemParams,
  body: z.object({ version, direction: z.enum(['up', 'down']) }).strict(),
});
export const statusItemRequest = requestSchema({
  params: itemParams,
  body: z.object({ version, active: z.boolean() }).strict(),
});
export const deleteItemRequest = requestSchema({
  params: itemParams,
  query: z.object({ version: z.coerce.number().int().positive() }).strict(),
});
export const listAuditRequest = requestSchema({
  params: kindParams,
  query: z.object(paginationShape).strict(),
});
