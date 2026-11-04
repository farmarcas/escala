import { randomInt } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LENGTH = 5;

// Código estável que substitui a identidade da pessoa na visão do operador (ex.: F-1A0PR).
export const generatePseudonym = (): string =>
  `F-${Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;

export const PSEUDONYM_PATTERN = /^F-[0-9A-Z]{5}$/;
