import { z } from 'zod';
import { requestSchema, uuidParam } from '../../../shared/http/request-schemas.js';
import { storeCodeParam } from '../params.js';
import { hoursSchema } from './hours.js';

const positive = z.number().int().positive().max(1_000_000).nullable();

export const structureSchema = z
  .object({
    ownBuilding: z.boolean().nullable().optional(),
    areaM2: positive.optional(),
    salesAreaM2: positive.optional(),
    staffCount: z.number().int().min(0).max(100_000).nullable().optional(),
    demandSystemId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const selectionsSchema = z
  .object({
    services: z.array(z.string().uuid()).optional(),
    practiceTools: z.array(z.string().uuid()).optional(),
    pbms: z.array(z.string().uuid()).optional(),
  })
  .strict();

export const freeSectionsSchema = z.array(
  z
    .object({
      id: z.string().uuid().optional(),
      title: z.string().trim().min(1).max(120),
      fields: z
        .array(
          z
            .object({ label: z.string().trim().min(1).max(120), value: z.string().trim().max(500) })
            .strict(),
        )
        .max(30),
    })
    .strict(),
);

// Partes da edição que vão junto com os dados básicos no PATCH da loja.
export const structureEditShape = {
  structure: structureSchema.optional(),
  hours: hoursSchema.optional(),
  selections: selectionsSchema.optional(),
  freeSections: freeSectionsSchema.optional(),
};

export type StructureEdit = {
  structure?: z.infer<typeof structureSchema>;
  hours?: z.infer<typeof hoursSchema>;
  selections?: z.infer<typeof selectionsSchema>;
  freeSections?: z.infer<typeof freeSectionsSchema>;
};

export const strategiesRequest = requestSchema({
  params: storeCodeParam,
  body: z.object({ itemIds: z.array(z.string().uuid()).max(50) }).strict(),
});

export const furnitureRequest = requestSchema({
  params: z
    .object({ code: z.coerce.number().int().positive(), itemId: z.string().uuid() })
    .strict(),
  body: z
    .object({
      quantity: z.number().int().min(0).max(10_000),
      tradeQuantity: z.number().int().min(0).max(10_000),
    })
    .strict(),
});

export const catalogRequest = requestSchema({
  query: z
    .object({
      kind: z
        .enum([
          'SERVICE',
          'DEMAND_SYSTEM',
          'PRACTICE_TOOL',
          'PBM',
          'STRATEGY',
          'FURNITURE',
          'EXTERNAL_TOOL',
          'CHANNEL',
        ])
        .optional(),
    })
    .strict(),
});

export { uuidParam };
