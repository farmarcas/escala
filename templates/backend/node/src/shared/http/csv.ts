import type { Response } from 'express';
import { AppError } from '../errors/app-error.js';

// Arquivo CSV que abre certo no Excel em português: separador ";", BOM UTF-8 e quebra \r\n
// (spec 003, R6). Valor que começa com =, +, - ou @ ganha um apóstrofo na frente, para a
// planilha não executar como fórmula.
export type CsvColumn<T> = { header: string; value: (row: T) => string | number | Date | null };

// Marca de UTF-8 no começo do arquivo: o Excel em português lê os acentos certo.
const BOM = '\uFEFF';

const FORMULA_START = /^[=+\-@]/;

const formatDate = (date: Date) =>
  `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;

const cell = (raw: string | number | Date | null): string => {
  if (raw === null) return '';
  const text = raw instanceof Date ? formatDate(raw) : String(raw);
  const safe = typeof raw === 'string' && FORMULA_START.test(text) ? `'${text}` : text;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = <T>(columns: CsvColumn<T>[], rows: T[]): string => {
  const lines = [
    columns.map((column) => cell(column.header)).join(';'),
    ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(';')),
  ];
  return `${BOM}${lines.join('\r\n')}\r\n`;
};

// Teto da exportação: acima disso, a pessoa filtra antes (spec 003, R6).
export const EXPORT_LIMIT = 5000;

export const assertExportSize = (total: number) => {
  if (total > EXPORT_LIMIT) {
    throw new AppError(
      `A lista tem ${total} linhas. Filtre para exportar até ${EXPORT_LIMIT}.`,
      413,
      'EXPORT_TOO_LARGE',
    );
  }
};

// Envia o arquivo para download, com a data no nome (ex.: lojas-2026-10-31.csv).
export const sendCsv = (res: Response, name: string, csv: string) => {
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${date}.csv"`);
  res.send(csv);
};
