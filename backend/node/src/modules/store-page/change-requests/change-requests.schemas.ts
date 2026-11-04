import { z } from 'zod';
import { requestSchema, uuidParam } from '../../../shared/http/request-schemas.js';
import { storeCodeParam } from '../params.js';

export const createChangeRequestSchema = z
  .object({
    type: z.enum(['CNPJ', 'ADDRESS', 'BRAND', 'TAX_REGIME']),
    // Validado pelo schema do tipo (types.ts).
    values: z.record(z.string(), z.unknown()),
    effectiveDate: z.iso.date().optional(),
    justification: z.string().trim().min(1, 'Explique o motivo do pedido').max(1000),
  })
  .strict();
export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;

export const actionSchema = z
  .object({
    action: z.enum(['advance', 'reject', 'contest', 'cancel']),
    note: z.string().trim().max(1000).optional(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const listChangeRequestsRequest = requestSchema({
  params: storeCodeParam,
  query: z.object({ status: z.enum(['OPEN', 'ALL']).default('OPEN') }).strict(),
});
export const createChangeRequestRequest = requestSchema({
  params: storeCodeParam,
  body: createChangeRequestSchema,
});
export const actChangeRequestRequest = requestSchema({ params: uuidParam, body: actionSchema });
export const attachDocumentRequest = requestSchema({
  params: uuidParam,
  body: z.object({ docType: z.string() }).strict(),
});
