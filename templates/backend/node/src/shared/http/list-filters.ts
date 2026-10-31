import { z } from 'zod';

// Filtro de vários valores ("+ Filtro" das listas): "SP,MG" vira ["SP", "MG"]. Os valores de um
// mesmo campo somam (ou), e campos diferentes se combinam (e).
const splitList = (value: string) => value.split(',').filter(Boolean);

export const listOf = <const T extends readonly string[]>(values: T) =>
  z
    .string()
    .transform(splitList)
    .pipe(z.array(z.enum(values)).min(1).max(50))
    .optional();

export const uuidListOf = () =>
  z.string().transform(splitList).pipe(z.array(z.string().uuid()).min(1).max(50)).optional();

// Anjo: ids de funcionário, ou NONE para "Sem Anjo".
export const NO_ANGEL = 'NONE';
export const angelListOf = () =>
  z
    .string()
    .transform(splitList)
    .pipe(
      z
        .array(z.union([z.string().uuid(), z.literal(NO_ANGEL)]))
        .min(1)
        .max(50),
    )
    .optional();

// Resposta das contagens: quantos registros há em cada valor do campo.
export type FacetCount = { value: string; count: number };
