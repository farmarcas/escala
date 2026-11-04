import { z } from 'zod';
import { paginationShape, requestSchema } from '../../shared/http/request-schemas.js';
import { storeCodeParam } from './params.js';
import { structureEditShape } from './structure/structure.schemas.js';

export { storeCodeParam };

export const updateStoreSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().max(500).optional(),
    // Validado campo a campo no service (camadas e permissões por lado).
    basic: z.record(z.string(), z.string().nullable()).optional(),
    // Estrutura, horário, catálogos marcados e seções livres (fatia 2).
    ...structureEditShape,
  })
  .strict();
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

export const validationSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();

export const historyQuery = z
  .object({
    ...paginationShape,
    kind: z.enum(['EDIT', 'REQUEST', 'DOCUMENT', 'VALIDATION', 'REMINDER']).optional(),
  })
  .strict();

export const getStoreRequest = requestSchema({ params: storeCodeParam });
export const updateStoreRequest = requestSchema({
  params: storeCodeParam,
  body: updateStoreSchema,
});
export const validateStoreRequest = requestSchema({
  params: storeCodeParam,
  body: validationSchema,
});
export const remindStoreRequest = requestSchema({ params: storeCodeParam });
export const historyRequest = requestSchema({ params: storeCodeParam, query: historyQuery });

export const uploadDocumentRequest = requestSchema({
  params: storeCodeParam,
  body: z
    .object({
      docType: z.string().min(1),
      validUntil: z.union([z.iso.date(), z.literal('')]).optional(),
    })
    .strict(),
});
export const downloadDocumentRequest = requestSchema({
  params: z
    .object({ code: z.coerce.number().int().positive(), documentId: z.string().uuid() })
    .strict(),
});
