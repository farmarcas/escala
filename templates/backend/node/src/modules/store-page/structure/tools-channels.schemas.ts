import { z } from 'zod';
import { requestSchema } from '../../../shared/http/request-schemas.js';
import { storeCodeParam } from '../params.js';

const itemParams = z
  .object({ code: z.coerce.number().int().positive(), itemId: z.string().uuid() })
  .strict();
const cents = z.number().int().min(0).max(100_000_000);

export const toolRequest = requestSchema({
  params: itemParams,
  body: z.object({ uses: z.boolean(), monthlyCostCents: cents.nullable().optional() }).strict(),
});

export const channelRequest = requestSchema({
  params: itemParams,
  body: z
    .object({ uses: z.boolean(), identifier: z.string().trim().max(200).nullable().optional() })
    .strict(),
});

export const noExternalToolsRequest = requestSchema({
  params: storeCodeParam,
  body: z.object({ value: z.boolean() }).strict(),
});

export const addCustomEntryRequest = requestSchema({
  params: storeCodeParam,
  body: z
    .object({
      kind: z.enum(['EXTERNAL_TOOL', 'CHANNEL']),
      name: z.string().trim().min(2).max(120),
      category: z.string().trim().max(80).optional(),
      identifier: z.string().trim().max(200).optional(),
      monthlyCostCents: cents.optional(),
    })
    .strict(),
});

export const updateCustomEntryRequest = requestSchema({
  params: z
    .object({ code: z.coerce.number().int().positive(), entryId: z.string().uuid() })
    .strict(),
  body: z
    .object({
      identifier: z.string().trim().max(200).nullable().optional(),
      monthlyCostCents: cents.nullable().optional(),
    })
    .strict(),
});

export const removeCustomEntryRequest = requestSchema({
  params: z
    .object({ code: z.coerce.number().int().positive(), entryId: z.string().uuid() })
    .strict(),
});
