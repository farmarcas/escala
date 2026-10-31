import { onlyDigits } from './cnpj.js';

// CPF válido: 11 dígitos, não todos iguais, com os dois dígitos verificadores certos.
export const isValidCpf = (value: string): boolean => {
  const digits = onlyDigits(value);
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    const sum = [...digits.slice(0, length)].reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0,
    );
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
};

// Só o começo e o fim aparecem: 123.***.***-09.
export const maskCpf = (cpf: string): string => `${cpf.slice(0, 3)}.***.***-${cpf.slice(9, 11)}`;
