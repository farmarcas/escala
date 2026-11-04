import { describe, expect, it } from 'vitest';
import {
  formatCnpj,
  formatDate,
  formatGroupNumber,
  formatNumber,
  formatPhone,
  formatStoreCode,
  pluralize,
} from './format';

describe('format', () => {
  it('formata números em pt-BR', () => {
    expect(formatNumber(1812)).toBe('1.812');
  });

  it('formata número do GE com 4 dígitos e código da loja', () => {
    expect(formatGroupNumber(66)).toBe('0066');
    expect(formatGroupNumber(417)).toBe('0417');
    expect(formatStoreCode(7)).toBe('LJ-007');
  });

  it('aplica a máscara de CNPJ aos poucos', () => {
    expect(formatCnpj('41583276000100')).toBe('41.583.276/0001-00');
    expect(formatCnpj('415832')).toBe('41.583.2');
    expect(formatCnpj('41.583.276/0001-00 extra 99')).toBe('41.583.276/0001-00');
  });

  it('formata telefone fixo e celular', () => {
    expect(formatPhone('11900004410')).toBe('(11) 90000-4410');
    expect(formatPhone('1130004410')).toBe('(11) 3000-4410');
  });

  it('formata data sem mudar o dia pelo fuso', () => {
    expect(formatDate('2026-07-31')).toBe('31/07/2026');
  });

  it('flexiona singular e plural', () => {
    expect(pluralize(1, 'loja', 'lojas')).toBe('1 loja');
    expect(pluralize(1812, 'loja', 'lojas')).toBe('1.812 lojas');
  });
});
