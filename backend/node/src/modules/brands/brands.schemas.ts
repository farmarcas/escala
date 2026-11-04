import { z } from 'zod';
import { paginationShape, requestSchema, uuidParam } from '../../shared/http/request-schemas.js';

export const brandStatusSchema = z.enum(['ACTIVE', 'HISTORICAL']);
export type BrandStatusValue = z.infer<typeof brandStatusSchema>;

const brandName = z.string().trim().min(2).max(60);

export const createBrandSchema = z.object({ name: brandName }).strict();
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = z
  .object({ name: brandName.optional(), status: brandStatusSchema.optional() })
  .strict()
  .refine((input) => input.name !== undefined || input.status !== undefined, {
    message: 'Informe ao menos um campo',
  });
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export const listBrandsQuery = z
  .object({ ...paginationShape, status: brandStatusSchema.optional() })
  .strict();
export type ListBrandsQuery = z.infer<typeof listBrandsQuery>;

export const listBrandsRequest = requestSchema({ query: listBrandsQuery });
export const brandStatsRequest = requestSchema({});
export const createBrandRequest = requestSchema({ body: createBrandSchema });
export const updateBrandRequest = requestSchema({ body: updateBrandSchema, params: uuidParam });
export const deleteBrandRequest = requestSchema({ params: uuidParam });
