import { describe, expect, it } from 'vitest';
import { isValidCpf, maskCpf } from './cpf.js';

describe('CPF', () => {
  it('deve aceitar CPF válido com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('deve recusar dígito errado, tamanho errado e números repetidos', () => {
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
  });

  it('deve mascarar o meio', () => {
    expect(maskCpf('52998224725')).toBe('529.***.***-25');
  });
});
