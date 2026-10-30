import { describe, expect, it } from 'vitest';
import { normalizeName } from './normalize-name.js';

describe('normalizeName', () => {
  it('deve ignorar maiúsculas, acentos e espaços repetidos', () => {
    expect(normalizeName('  Mais   SAÚDE ')).toBe('mais saude');
    expect(normalizeName('Mais Saude')).toBe(normalizeName('mais saúde'));
  });
});
