import { useState } from 'react';
import { fieldErrors, type ApiError } from '@/lib/api';
import { formatCnpj, formatPhone, onlyDigits } from '@/lib/format';
import type { GroupDetail, GroupInput } from '../types';

type Values = {
  name: string;
  legalName: string;
  cnpj: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
};

const EMPTY: Values = {
  name: '',
  legalName: '',
  cnpj: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
};

function fromGroup(group: GroupDetail | undefined): Values {
  if (!group) return EMPTY;
  return {
    name: group.name,
    legalName: group.legalName,
    cnpj: formatCnpj(group.cnpj),
    ownerName: group.owner?.name ?? '',
    ownerEmail: group.owner?.email ?? '',
    ownerPhone: group.owner?.phone ? formatPhone(group.owner.phone) : '',
  };
}

// Estado e validação do formulário de grupo (novo e editar).
export function useGroupForm(group: GroupDetail | undefined) {
  const [values, setValues] = useState<Values>(() => fromGroup(group));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const setField = (field: keyof Values, raw: string) => {
    const value =
      field === 'cnpj' ? formatCnpj(raw) : field === 'ownerPhone' ? formatPhone(raw) : raw;
    setValues((current) => ({ ...current, [field]: value }));
    setLocalErrors((current) => ({ ...current, [field]: '' }));
  };

  const hasOwner = Boolean(values.ownerName || values.ownerEmail || values.ownerPhone);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (values.name.trim().length < 2) errors.name = 'Informe o nome do grupo';
    if (values.legalName.trim().length < 2) errors.legalName = 'Informe a razão social';
    if (onlyDigits(values.cnpj).length !== 14) errors.cnpj = 'O CNPJ tem 14 dígitos';
    if (hasOwner) {
      if (values.ownerName.trim().length < 3) errors.ownerName = 'Informe o nome completo';
      if (!/^\S+@\S+\.\S+$/.test(values.ownerEmail.trim())) errors.ownerEmail = 'E-mail inválido';
      const phone = onlyDigits(values.ownerPhone).length;
      if (phone < 10 || phone > 11) errors.ownerPhone = 'Informe DDD e número';
    }
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toInput = (): GroupInput => ({
    name: values.name.trim(),
    legalName: values.legalName.trim(),
    cnpj: onlyDigits(values.cnpj),
    ...(hasOwner
      ? {
          owner: {
            name: values.ownerName.trim(),
            email: values.ownerEmail.trim(),
            phone: onlyDigits(values.ownerPhone),
          },
        }
      : {}),
  });

  // No editar, só manda o que mudou (a auditoria registra os campos alterados).
  const toChanges = (): Partial<GroupInput> => {
    const input = toInput();
    const before = fromGroup(group);
    const changes: Partial<GroupInput> = {};
    if (input.name !== before.name) changes.name = input.name;
    if (input.legalName !== before.legalName) changes.legalName = input.legalName;
    if (input.cnpj !== onlyDigits(before.cnpj)) changes.cnpj = input.cnpj;
    const ownerChanged =
      values.ownerName !== before.ownerName ||
      values.ownerEmail !== before.ownerEmail ||
      values.ownerPhone !== before.ownerPhone;
    if (input.owner && ownerChanged) changes.owner = input.owner;
    return changes;
  };

  const errorsFrom = (apiError: ApiError | null) => {
    const remote = fieldErrors(apiError);
    return {
      name: localErrors.name || remote.name,
      legalName: localErrors.legalName || remote.legalName,
      cnpj: localErrors.cnpj || remote.cnpj,
      ownerName: localErrors.ownerName || remote['owner.name'],
      ownerEmail: localErrors.ownerEmail || remote['owner.email'],
      ownerPhone: localErrors.ownerPhone || remote['owner.phone'],
    };
  };

  return { values, setField, validate, toInput, toChanges, errorsFrom };
}
