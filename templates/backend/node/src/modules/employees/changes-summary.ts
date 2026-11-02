// Texto do histórico quando os dados do funcionário mudam: "Campo: antes → depois; ...".
export type EmployeeSnapshot = {
  name: string;
  email: string;
  gender: string | null;
  mobile: string | null;
  landline: string | null;
  department: string;
  occupation: string;
};

const LABEL: Record<keyof EmployeeSnapshot, string> = {
  name: 'Nome',
  email: 'E-mail',
  gender: 'Gênero',
  mobile: 'Celular',
  landline: 'Telefone fixo',
  department: 'Departamento',
  occupation: 'Ocupação',
};

export const GENDER_LABEL: Record<string, string> = {
  FEMALE: 'Feminino',
  MALE: 'Masculino',
  OTHER: 'Outro',
  UNDISCLOSED: 'Prefiro não informar',
};

// (11) 96034-8829 e (11) 3045-0000.
export const formatPhone = (digits: string) =>
  digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

const show = (key: keyof EmployeeSnapshot, value: string | null) => {
  if (!value) return '(vazio)';
  if (key === 'gender') return GENDER_LABEL[value] ?? value;
  if (key === 'mobile' || key === 'landline') return formatPhone(value);
  return value;
};

export const changesSummary = (before: EmployeeSnapshot, after: EmployeeSnapshot) => {
  const parts = (Object.keys(LABEL) as (keyof EmployeeSnapshot)[])
    .filter((key) => before[key] !== after[key])
    .map((key) => `${LABEL[key]}: ${show(key, before[key])} → ${show(key, after[key])}`);
  return parts.length === 0 ? null : parts.join('; ');
};
