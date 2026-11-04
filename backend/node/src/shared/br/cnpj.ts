const CNPJ_LENGTH = 14;
const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, ...FIRST_WEIGHTS];

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

const checkDigit = (digits: number[], weights: number[]): number => {
  const sum = weights.reduce((total, weight, index) => total + weight * (digits[index] ?? 0), 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

// Aceita com ou sem máscara. Rejeita tamanho errado, sequência repetida e dígito verificador inválido.
export const isValidCnpj = (value: string): boolean => {
  const clean = onlyDigits(value);
  if (clean.length !== CNPJ_LENGTH || /^(\d)\1+$/.test(clean)) return false;

  const digits = [...clean].map(Number);
  const first = checkDigit(digits, FIRST_WEIGHTS);
  const second = checkDigit(digits, SECOND_WEIGHTS);
  return digits[12] === first && digits[13] === second;
};
