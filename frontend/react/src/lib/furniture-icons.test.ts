import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FURNITURE_ICON,
  FURNITURE_ICON_GROUPS,
  FURNITURE_ICONS,
  furnitureIcon,
  searchIcons,
} from './furniture-icons';

describe('galeria de ícones do mobiliário', () => {
  it('tem chaves únicas e todo ícone num grupo conhecido', () => {
    const keys = FURNITURE_ICONS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      FURNITURE_ICONS.every((item) => FURNITURE_ICON_GROUPS.includes(item.group as never)),
    ).toBe(true);
  });

  it('chave desconhecida ou vazia mostra o ícone padrão', () => {
    expect(furnitureIcon('foguete').key).toBe(DEFAULT_FURNITURE_ICON);
    expect(furnitureIcon(null).key).toBe(DEFAULT_FURNITURE_ICON);
    expect(furnitureIcon('refrigerator').label).toBe('Geladeira');
  });

  it('busca por palavra sem diferença de acento ou maiúscula', () => {
    expect(searchIcons('GELADEIRA').map((item) => item.key)).toEqual(
      expect.arrayContaining(['refrigerator', 'cooler-drink']),
    );
    expect(searchIcons('balcão').map((item) => item.key)).toContain('counter');
    expect(searchIcons('tela').map((item) => item.key)).toContain('monitor');
    expect(searchIcons('caixa').map((item) => item.key)).toContain('cash-register');
    expect(searchIcons('')).toHaveLength(FURNITURE_ICONS.length);
    expect(searchIcons('xyzw')).toEqual([]);
  });
});
