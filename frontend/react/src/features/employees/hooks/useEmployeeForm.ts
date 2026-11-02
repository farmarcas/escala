import { useState } from 'react';
import { fieldErrors, type ApiError } from '@/lib/api';
import { formatPhone, onlyDigits } from '@/lib/format';
import type { EmployeeDetail, EmployeeGender, EmployeeInput } from '../types';

type Values = {
  name: string;
  email: string;
  gender: EmployeeGender | '';
  mobile: string;
  landline: string;
  departmentId: string;
  occupationId: string;
};

function fromEmployee(employee: EmployeeDetail | undefined): Values {
  return {
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    gender: employee?.gender ?? '',
    mobile: employee?.mobile ? formatPhone(employee.mobile) : '',
    landline: employee?.landline ? formatPhone(employee.landline) : '',
    departmentId: employee?.department.id ?? '',
    occupationId: employee?.occupation.id ?? '',
  };
}

// Estado e validação dos dados gerais do funcionário (cadastro e aba Dados gerais).
export function useEmployeeForm(employee: EmployeeDetail | undefined) {
  const [values, setValues] = useState<Values>(() => fromEmployee(employee));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const setField = <K extends keyof Values>(field: K, raw: Values[K]) => {
    const value = (
      field === 'mobile' || field === 'landline' ? formatPhone(String(raw)) : raw
    ) as Values[K];
    setValues((current) => ({ ...current, [field]: value }));
    setLocalErrors((current) => ({ ...current, [field]: '' }));
  };

  const reset = () => {
    setValues(fromEmployee(employee));
    setLocalErrors({});
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (values.name.trim().length < 3) errors.name = 'Informe o nome completo';
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'E-mail inválido';
    if (onlyDigits(values.mobile).length !== 11) errors.mobile = 'Informe DDD e os 9 dígitos';
    const landline = onlyDigits(values.landline).length;
    if (landline > 0 && landline !== 10) errors.landline = 'Informe DDD e os 8 dígitos';
    if (!values.departmentId) errors.departmentId = 'Escolha o departamento';
    if (!values.occupationId) errors.occupationId = 'Escolha a ocupação';
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toInput = (): EmployeeInput => ({
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    gender: values.gender || null,
    mobile: onlyDigits(values.mobile),
    landline: onlyDigits(values.landline) || null,
    departmentId: values.departmentId,
    occupationId: values.occupationId,
  });

  // Na edição, só manda o que mudou (o histórico registra cada campo com antes e depois).
  const toChanges = (): Partial<EmployeeInput> => {
    const input = toInput();
    if (!employee) return input;
    const current: EmployeeInput = {
      name: employee.name,
      email: employee.email,
      gender: employee.gender,
      mobile: employee.mobile ?? '',
      landline: employee.landline,
      departmentId: employee.department.id,
      occupationId: employee.occupation.id,
    };
    return Object.fromEntries(
      (Object.keys(input) as (keyof EmployeeInput)[])
        .filter((key) => input[key] !== current[key])
        .map((key) => [key, input[key]]),
    );
  };

  return {
    values,
    setField,
    reset,
    validate,
    toInput,
    toChanges,
    errorsFrom: (error: ApiError | null) => ({
      ...fieldErrors(error),
      ...withoutEmpty(localErrors),
    }),
  };
}

function withoutEmpty(errors: Record<string, string>) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
