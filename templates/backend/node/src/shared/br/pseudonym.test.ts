import { describe, expect, it } from 'vitest';
import { generatePseudonym, PSEUDONYM_PATTERN } from './pseudonym.js';

describe('generatePseudonym', () => {
  it('deve gerar código no formato F-XXXXX', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generatePseudonym()).toMatch(PSEUDONYM_PATTERN);
    }
  });
});
