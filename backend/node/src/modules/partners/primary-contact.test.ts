import { describe, expect, it } from 'vitest';
import { hasReach, shouldBePrimary } from './primary-contact.js';

describe('parceiros · contato principal', () => {
  it('o primeiro contato vira principal sem pedir', () => {
    expect(shouldBePrimary(undefined, false)).toBe(true);
  });

  it('os seguintes só viram principal quando pedido', () => {
    expect(shouldBePrimary(undefined, true)).toBe(false);
    expect(shouldBePrimary(true, true)).toBe(true);
    expect(shouldBePrimary(false, false)).toBe(false);
  });

  it('contato sem e-mail e sem telefone não serve', () => {
    expect(hasReach({ email: null, phone: null })).toBe(false);
    expect(hasReach({ email: 'a@b.com.br', phone: null })).toBe(true);
    expect(hasReach({ email: null, phone: '11900000000' })).toBe(true);
  });
});
