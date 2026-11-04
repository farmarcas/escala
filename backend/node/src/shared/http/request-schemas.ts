import { z, type ZodDefault, type ZodType } from 'zod';

const MAX_PAGE_SIZE = 100;

export const emptyObject = z.object({}).strict();

export const paginationShape = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(20),
};

export const uuidParam = z.object({ id: z.string().uuid() }).strict();

// Campo de texto livre de busca: vazio vira "sem filtro".
export const searchQuery = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value ? value : undefined))
  .optional();

const emptyPart = emptyObject.default({});
type Part<T> = T extends ZodType ? T : ZodDefault<typeof emptyObject>;

// Monta o schema { body, params, query } que o middleware validate() espera.
// Parte não informada só aceita objeto vazio.
export const requestSchema = <
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
>(parts: {
  body?: B;
  params?: P;
  query?: Q;
}) =>
  z.object({
    body: (parts.body ?? emptyPart) as Part<B>,
    params: (parts.params ?? emptyPart) as Part<P>,
    query: (parts.query ?? emptyPart) as Part<Q>,
  });

export type Paginated<T> = { data: T[]; meta: { page: number; pageSize: number; total: number } };
