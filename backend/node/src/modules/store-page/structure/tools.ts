// Ferramentas externas da loja: custo, condições negociadas pela Farmarcas e economia possível (US8).
// Dinheiro sempre em centavos (inteiro), sem erro de arredondamento.

export type ToolLine = {
  name: string;
  uses: boolean | null; // null = grupo ainda não informou
  monthlyCostCents: number | null;
  negotiatedMonthlyCents: number | null; // null = sem condição Farmarcas
};

export type ToolsSummary = {
  inUse: number;
  monthlyCents: number;
  yearlyCents: number;
  negotiatedTotal: number;
  negotiatedInUse: number;
  yearlySavingsCents: number;
};

const MONTHS = 12;

// Economia de uma ferramenta: o que passa da condição Farmarcas, em um ano.
export const yearlySavingsOf = (line: ToolLine): number => {
  if (!line.uses || line.negotiatedMonthlyCents === null) return 0;
  return Math.max(0, (line.monthlyCostCents ?? 0) - line.negotiatedMonthlyCents) * MONTHS;
};

export const summarizeTools = (lines: ToolLine[]): ToolsSummary => {
  const used = lines.filter((line) => line.uses);
  const negotiated = lines.filter((line) => line.negotiatedMonthlyCents !== null);
  const monthlyCents = used.reduce((sum, line) => sum + (line.monthlyCostCents ?? 0), 0);
  return {
    inUse: used.length,
    monthlyCents,
    yearlyCents: monthlyCents * MONTHS,
    negotiatedTotal: negotiated.length,
    negotiatedInUse: negotiated.filter((line) => line.uses).length,
    yearlySavingsCents: lines.reduce((sum, line) => sum + yearlySavingsOf(line), 0),
  };
};

export const formatBrl = (cents: number) => `R$ ${Math.round(cents / 100).toLocaleString('pt-BR')}`;

// Texto curto para o histórico ("Usa · R$ 650/mês", "Não usa", "Não informado").
export const toolText = (uses: boolean | null, monthlyCostCents: number | null) =>
  uses === null
    ? 'Não informado'
    : uses
      ? `Usa · ${formatBrl(monthlyCostCents ?? 0)}/mês`
      : 'Não usa';

export const channelText = (uses: boolean | null, identifier: string | null) =>
  uses === null ? 'Não informado' : uses ? `Usa${identifier ? ` · ${identifier}` : ''}` : 'Não usa';
