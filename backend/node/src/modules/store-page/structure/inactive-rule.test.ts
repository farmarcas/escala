import { describe, expect, it } from 'vitest';
import { canAnswerInactive, newlyAddedInactive } from './inactive-rule.js';

describe('newlyAddedInactive', () => {
  const active = new Set(['a', 'b']);

  it('aceita manter um desativado que já estava marcado', () => {
    expect(newlyAddedInactive(['a', 'x'], ['a', 'x'], active)).toEqual([]);
  });

  it('aceita desmarcar um desativado', () => {
    expect(newlyAddedInactive(['x'], [], active)).toEqual([]);
  });

  it('recusa marcar agora um desativado', () => {
    expect(newlyAddedInactive(['a'], ['a', 'x'], active)).toEqual(['x']);
  });

  it('aceita marcar um ativo novo', () => {
    expect(newlyAddedInactive([], ['b'], active)).toEqual([]);
  });
});

describe('canAnswerInactive', () => {
  it('deixa mudar quando a loja já usa', () => {
    expect(canAnswerInactive(true, true)).toBe(true);
    expect(canAnswerInactive(true, false)).toBe(true);
  });

  it('deixa gravar "não usa" mesmo sem resposta antes', () => {
    expect(canAnswerInactive(false, false)).toBe(true);
  });

  it('não deixa começar a usar', () => {
    expect(canAnswerInactive(false, true)).toBe(false);
  });
});
