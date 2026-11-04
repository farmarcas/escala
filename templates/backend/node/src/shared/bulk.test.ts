import { describe, expect, it } from 'vitest';
import { splitBulk } from './bulk.js';

describe('ação em lote', () => {
  it('deve separar o que muda e contar como puladas as não achadas e as que já estão no estado', () => {
    const found = [
      { id: 1, done: false },
      { id: 2, done: true },
    ];

    const result = splitBulk(3, found, (item) => !item.done);

    expect(result.toChange.map((item) => item.id)).toEqual([1]);
    expect(result.skipped).toBe(2);
  });
});
