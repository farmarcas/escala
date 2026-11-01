import { describe, expect, it } from 'vitest';
import { moveInOrder } from './move.js';

describe('moveInOrder', () => {
  const ids = ['a', 'b', 'c'];

  it('sobe trocando com o anterior', () => {
    expect(moveInOrder(ids, 'b', 'up')).toEqual(['b', 'a', 'c']);
  });

  it('desce trocando com o seguinte', () => {
    expect(moveInOrder(ids, 'b', 'down')).toEqual(['a', 'c', 'b']);
  });

  it('não muda nada nas pontas', () => {
    expect(moveInOrder(ids, 'a', 'up')).toBe(ids);
    expect(moveInOrder(ids, 'c', 'down')).toBe(ids);
  });

  it('pula quem a pessoa não vê junto (ex.: desativados na lista de ativos)', () => {
    const visible = (other: string) => other !== 'b';
    expect(moveInOrder(ids, 'c', 'up', visible)).toEqual(['c', 'b', 'a']);
    expect(moveInOrder(ids, 'a', 'down', visible)).toEqual(['c', 'b', 'a']);
    expect(moveInOrder(['b', 'a'], 'a', 'up', visible)).toEqual(['b', 'a']);
  });

  it('ignora item que não está na lista', () => {
    expect(moveInOrder(ids, 'x', 'up')).toBe(ids);
  });
});
