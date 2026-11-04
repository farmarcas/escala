import { z } from 'zod';

// Código numérico da loja na URL (LJ-002 → 2).
export const storeCodeParam = z.object({ code: z.coerce.number().int().positive() }).strict();
