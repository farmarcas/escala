import { describe, expect, it } from 'vitest';
import { channelText, summarizeTools, toolText, yearlySavingsOf, type ToolLine } from './tools.js';

const line = (overrides: Partial<ToolLine>): ToolLine => ({
  name: 'X',
  uses: true,
  monthlyCostCents: 0,
  negotiatedMonthlyCents: null,
  ...overrides,
});

describe('ferramentas externas', () => {
  it('Infoprice a R$ 650 com condição de R$ 490 economiza R$ 1.920 por ano', () => {
    expect(yearlySavingsOf(line({ monthlyCostCents: 65000, negotiatedMonthlyCents: 49000 }))).toBe(
      192000,
    );
  });

  it('não há economia abaixo da condição, sem uso ou sem negociação', () => {
    expect(yearlySavingsOf(line({ monthlyCostCents: 30000, negotiatedMonthlyCents: 35000 }))).toBe(
      0,
    );
    expect(
      yearlySavingsOf(
        line({ uses: false, monthlyCostCents: 65000, negotiatedMonthlyCents: 49000 }),
      ),
    ).toBe(0);
    expect(yearlySavingsOf(line({ monthlyCostCents: 65000 }))).toBe(0);
  });

  it('resume custo, negociações em uso e economia', () => {
    const summary = summarizeTools([
      line({ name: 'Imendes', monthlyCostCents: 38000 }),
      line({ name: 'Infoprice', monthlyCostCents: 65000, negotiatedMonthlyCents: 49000 }),
      line({ name: 'Solides', monthlyCostCents: 42000, negotiatedMonthlyCents: 35000 }),
      line({ name: 'Cotefácil', uses: null, monthlyCostCents: null, negotiatedMonthlyCents: 0 }),
    ]);
    expect(summary).toEqual({
      inUse: 3,
      monthlyCents: 145000,
      yearlyCents: 1740000,
      negotiatedTotal: 3,
      negotiatedInUse: 2,
      yearlySavingsCents: 192000 + 84000,
    });
  });

  it('descreve para o histórico', () => {
    expect(toolText(true, 65000)).toBe('Usa · R$ 650/mês');
    expect(toolText(null, null)).toBe('Não informado');
    expect(channelText(true, '@drogariaaurora')).toBe('Usa · @drogariaaurora');
    expect(channelText(false, null)).toBe('Não usa');
  });
});
