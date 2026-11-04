import { describe, expect, it } from 'vitest';
import { changesText } from './audit-summary.js';

const base = {
  name: 'Aferição de Glicemia',
  groupLabel: null,
  description: null,
  icon: null,
  selfService: false,
  usedByScale: false,
  negotiatedMonthlyCents: null,
};

describe('changesText', () => {
  it('descreve só o que mudou, com antes e depois', () => {
    expect(changesText('Serviços', base, { ...base, name: 'Teste de glicemia' })).toBe(
      'Serviços · Aferição de Glicemia: Nome: Aferição de Glicemia → Teste de glicemia',
    );
  });

  it('usa o nome do agrupador de cada lista e mostra sim, não, vazio e reais', () => {
    expect(
      changesText('Ferramentas externas', base, {
        ...base,
        groupLabel: 'Fiscal',
        negotiatedMonthlyCents: 49000,
      }),
    ).toBe(
      'Ferramentas externas · Aferição de Glicemia: Categoria: (vazio) → Fiscal; Valor negociado: (vazio) → R$ 490,00',
    );
    expect(changesText('Mobiliário', base, { ...base, selfService: true })).toContain(
      'Autosserviço: Não → Sim',
    );
  });

  it('devolve nulo quando nada mudou', () => {
    expect(changesText('Serviços', base, { ...base })).toBeNull();
  });
});
