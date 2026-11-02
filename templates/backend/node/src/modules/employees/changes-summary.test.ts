import { describe, expect, it } from 'vitest';
import { changesSummary, formatPhone } from './changes-summary.js';

const base = {
  name: 'Adriana Oliveira',
  email: 'adriana@farmarcas.com.br',
  gender: null,
  mobile: null,
  landline: null,
  department: 'Trade',
  occupation: 'Analista',
};

describe('changesSummary', () => {
  it('descreve só o que mudou, com telefone e gênero legíveis', () => {
    expect(
      changesSummary(base, {
        ...base,
        mobile: '11960348829',
        gender: 'FEMALE',
        occupation: 'Coordenadora',
      }),
    ).toBe(
      'Gênero: (vazio) → Feminino; Celular: (vazio) → (11) 96034-8829; Ocupação: Analista → Coordenadora',
    );
  });

  it('devolve nulo quando nada mudou', () => {
    expect(changesSummary(base, { ...base })).toBeNull();
  });

  it('formata celular e fixo', () => {
    expect(formatPhone('1130450000')).toBe('(11) 3045-0000');
  });
});
