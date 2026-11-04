import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url(),
    // Identidade simulada (cabeçalho x-demo-role). Nunca pode existir em produção.
    DEMO_IDENTITY_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .refine((value) => !(value.NODE_ENV === 'production' && value.DEMO_IDENTITY_ENABLED), {
    message: 'DEMO_IDENTITY_ENABLED não pode ser usado em produção',
    path: ['DEMO_IDENTITY_ENABLED'],
  });

export const env = envSchema.parse(process.env);
