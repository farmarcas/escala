import { useState } from 'react';
import { fieldErrors, type ApiError } from '@/lib/api';
import { formatCnpj, formatZip, onlyDigits } from '@/lib/format';
import type { StoreInput, StoreType } from '../types';

type Values = Omit<StoreInput, 'openedAt' | 'zip'> & { openedAt: string; zip: string };

const EMPTY: Values = {
  name: '',
  type: 'PDV',
  cnpj: '',
  brandId: '',
  street: '',
  number: '',
  district: '',
  zip: '',
  city: '',
  uf: '',
  openedAt: '',
};

// Mensagens da API traduzidas para o campo certo.
const CONFLICT_FIELD: Record<string, keyof Values> = {
  STORE_CNPJ_TAKEN: 'cnpj',
  BRAND_INACTIVE: 'brandId',
  BRAND_NOT_FOUND: 'brandId',
};

export function useStoreForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [localErrors, setLocalErrors] = useState<Partial<Record<keyof Values, string>>>({});

  const setField = (field: keyof Values, raw: string) => {
    const value = field === 'cnpj' ? formatCnpj(raw) : field === 'zip' ? formatZip(raw) : raw;
    setValues((current) => ({ ...current, [field]: value }));
    setLocalErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setType = (type: StoreType) => setValues((current) => ({ ...current, type }));

  const validate = () => {
    const errors: Partial<Record<keyof Values, string>> = {};
    if (values.name.trim().length < 2) errors.name = 'Informe o nome da loja';
    if (onlyDigits(values.cnpj).length !== 14) errors.cnpj = 'O CNPJ tem 14 dígitos';
    if (!values.brandId) errors.brandId = 'Escolha uma marca ativa';
    if (values.street.trim().length < 3) errors.street = 'Informe o logradouro';
    if (values.number.trim().length < 1) errors.number = 'Informe o número';
    if (values.district.trim().length < 2) errors.district = 'Informe o bairro';
    if (values.zip && onlyDigits(values.zip).length !== 8) errors.zip = 'O CEP tem 8 dígitos';
    if (values.city.trim().length < 2) errors.city = 'Informe a cidade';
    if (!values.uf) errors.uf = 'Escolha a UF';
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toInput = (): StoreInput => ({
    name: values.name.trim(),
    type: values.type,
    cnpj: onlyDigits(values.cnpj),
    brandId: values.brandId,
    street: values.street.trim(),
    number: values.number.trim(),
    district: values.district.trim(),
    ...(values.zip ? { zip: onlyDigits(values.zip) } : {}),
    city: values.city.trim(),
    uf: values.uf,
    ...(values.openedAt ? { openedAt: values.openedAt } : {}),
  });

  const errorsFrom = (apiError: ApiError | null): Partial<Record<keyof Values, string>> => {
    const remote = fieldErrors(apiError) as Partial<Record<keyof Values, string>>;
    const conflictField = apiError ? CONFLICT_FIELD[apiError.code] : undefined;
    if (apiError && conflictField) remote[conflictField] = apiError.message;
    return { ...remote, ...Object.fromEntries(Object.entries(localErrors).filter(([, v]) => v)) };
  };

  return { values, setField, setType, validate, toInput, errorsFrom };
}
