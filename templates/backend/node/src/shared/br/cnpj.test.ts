import { describe, expect, it } from 'vitest';
import { isValidCnpj, onlyDigits } from './cnpj.js';

describe('isValidCnpj', () => {
  it('deve aceitar CNPJ válido com ou sem máscara', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11222333000181')).toBe(true);
  });

  it('deve recusar dígito verificador errado', () => {
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
  });

  it('deve recusar tamanho errado e sequência repetida', () => {
    expect(isValidCnpj('1122233300018')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });
});

describe('onlyDigits', () => {
  it('deve remover a máscara', () => {
    expect(onlyDigits('11.222.333/0001-81')).toBe('11222333000181');
  });
});
