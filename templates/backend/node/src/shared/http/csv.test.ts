import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.js';

type Row = { name: string; count: number; at: Date | null };

const columns = [
  { header: 'Nome', value: (row: Row) => row.name },
  { header: 'Lojas', value: (row: Row) => row.count },
  { header: 'Desde', value: (row: Row) => row.at },
];

describe('CSV', () => {
  it('deve começar com BOM, usar ; e \\r\\n e formatar datas dd/mm/aaaa', () => {
    const csv = toCsv(columns, [
      { name: 'São Paulo', count: 3, at: new Date('2026-10-05T00:00:00Z') },
    ]);

    expect(csv).toBe('\uFEFFNome;Lojas;Desde\r\nSão Paulo;3;05/10/2026\r\n');
  });

  it('deve pôr entre aspas o que tem ; aspas ou quebra de linha', () => {
    const csv = toCsv(columns, [{ name: 'Rua "A"; nº 1', count: 1, at: null }]);

    expect(csv.split('\r\n')[1]).toBe('"Rua ""A""; nº 1";1;');
  });

  it('não deve deixar a planilha executar fórmula', () => {
    const csv = toCsv(columns, [{ name: '=SOMA(A1)', count: -1, at: null }]);

    expect(csv.split('\r\n')[1]).toBe("'=SOMA(A1);-1;");
  });

  it('deve sair só com o cabeçalho quando não há linhas', () => {
    expect(toCsv(columns, [])).toBe('\uFEFFNome;Lojas;Desde\r\n');
  });
});
