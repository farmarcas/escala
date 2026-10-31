import { useState } from 'react';
import { fieldErrors, type ApiError } from '@/lib/api';
import { formatPhone, onlyDigits } from '@/lib/format';
import type { EmployeeAccessRole, EmployeeArea, EmployeeDetail, EmployeeInput } from '../types';

type Values = {
  name: string;
  email: string;
  phone: string;
  area: EmployeeArea | '';
  jobTitle: string;
  accessRole: EmployeeAccessRole | '';
};

function fromEmployee(employee: EmployeeDetail | undefined): Values {
  return {
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ? formatPhone(employee.phone) : '',
    area: employee?.area ?? '',
    jobTitle: employee?.jobTitle ?? '',
    accessRole: employee?.accessRole ?? '',
  };
}

// Estado e validação do formulário de funcionário (novo e editar).
export function useEmployeeForm(employee: EmployeeDetail | undefined) {
  const [values, setValues] = useState<Values>(() => fromEmployee(employee));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const setField = <K extends keyof Values>(field: K, raw: Values[K]) => {
    const value = (field === 'phone' ? formatPhone(String(raw)) : raw) as Values[K];
    setValues((current) => ({ ...current, [field]: value }));
    setLocalErrors((current) => ({ ...current, [field]: '' }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (values.name.trim().length < 3) errors.name = 'Informe o nome completo';
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'E-mail inválido';
    const phone = onlyDigits(values.phone).length;
    if (phone > 0 && (phone < 10 || phone > 11)) errors.phone = 'Informe DDD e número';
    if (!values.area) errors.area = 'Escolha a área';
    if (values.jobTitle.trim().length < 2) errors.jobTitle = 'Informe o cargo';
    if (!values.accessRole) errors.accessRole = 'Escolha o papel de acesso';
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toInput = (): EmployeeInput => ({
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: onlyDigits(values.phone) || null,
    area: values.area as EmployeeArea,
    jobTitle: values.jobTitle.trim(),
    accessRole: values.accessRole as EmployeeAccessRole,
  });

  // No editar, só manda o que mudou (o histórico registra os campos alterados).
  const toChanges = (): Partial<EmployeeInput> => {
    const input = toInput();
    if (!employee) return input;
    return Object.fromEntries(
      (Object.keys(input) as (keyof EmployeeInput)[])
        .filter((key) => input[key] !== employee[key])
        .map((key) => [key, input[key]]),
    );
  };

  return {
    values,
    setField,
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
