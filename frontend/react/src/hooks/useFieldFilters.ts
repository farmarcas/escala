import { useState } from 'react';

// Filtros do "+ Filtro": cada campo guarda vários valores, que somam (ou); campos diferentes se
// combinam (e).
export type FieldValues<F extends string = string> = Partial<Record<F, string[]>>;

// Query da API: cada campo vira "valor1,valor2".
export function fieldsQuery(fields: FieldValues): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, values]) => [
      key,
      Array.isArray(values) && values.length ? values.join(',') : undefined,
    ]),
  );
}

const sameValues = (a: string[] | undefined, b: string[]) =>
  (a?.length ?? 0) === b.length && b.every((value) => a?.includes(value));

const matches = <F extends string>(fields: FieldValues<F>, preset: FieldValues<F>) =>
  (Object.entries(preset) as [F, string[]][]).every(([key, values]) =>
    sameValues(fields[key], values),
  );

// Estado dos campos e as ações das etiquetas, atalhos e indicadores. onChange avisa a lista
// (para voltar à primeira página).
export function useFieldFilters<F extends string>(
  initial: FieldValues<F> | (() => FieldValues<F>),
  onChange?: () => void,
) {
  const [fields, setFields] = useState<FieldValues<F>>(initial);

  const update = (next: (current: FieldValues<F>) => FieldValues<F>) => {
    setFields(next);
    onChange?.();
  };

  const setField = (field: F, values: string[]) =>
    update((current) => {
      const next = { ...current };
      if (values.length) next[field] = values;
      else delete next[field];
      return next;
    });

  return {
    fields,
    setField,
    // Indicador clicável: liga só aquele valor; clicar de novo desliga.
    toggleSingle: (field: F, value: string) =>
      setField(field, sameValues(fields[field], [value]) ? [] : [value]),
    isSingle: (field: F, value: string) => sameValues(fields[field], [value]),
    // Atalho: liga (ou desliga) um conjunto de campos de uma vez.
    isPreset: (preset: FieldValues<F>) => matches(fields, preset),
    togglePreset: (preset: FieldValues<F>) =>
      update((current) => {
        const isOn = matches(current, preset);
        const next = { ...current };
        for (const [key, values] of Object.entries(preset) as [F, string[]][]) {
          if (isOn) delete next[key];
          else next[key] = values;
        }
        return next;
      }),
    clearFields: () => update(() => ({})),
    hasFields: Object.keys(fields).length > 0,
  };
}

export type FieldFilters<F extends string> = ReturnType<typeof useFieldFilters<F>>;
