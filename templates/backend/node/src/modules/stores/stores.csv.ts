import type { CsvColumn } from '../../shared/http/csv.js';
import { STAGE_LABEL } from './stage.js';
import type { StoreRecord } from './stores.service.js';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente no grupo',
  ACTIVE: 'Ativa',
  INACTIVE: 'Inativa',
};

const code = (value: number) => `LJ-${String(value).padStart(3, '0')}`;
const cnpj = (value: string) =>
  value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

// Colunas do CSV da lista de lojas: o que está na tela, sem dado pessoal.
export const STORE_CSV_COLUMNS: CsvColumn<StoreRecord>[] = [
  { header: 'GE', value: (row) => String(row.groupNumber).padStart(4, '0') },
  { header: 'Grupo', value: (row) => row.groupName },
  { header: 'Código', value: (row) => code(row.code) },
  { header: 'Loja', value: (row) => row.name },
  { header: 'Razão social', value: (row) => row.legalName },
  { header: 'Marca', value: (row) => row.brand.name },
  { header: 'Tipo', value: (row) => row.type },
  { header: 'CNPJ', value: (row) => cnpj(row.cnpj) },
  { header: 'Cidade', value: (row) => row.city },
  { header: 'UF', value: (row) => row.uf },
  { header: 'Etapa', value: (row) => STAGE_LABEL[row.stage] },
  { header: 'Situação', value: (row) => STATUS_LABEL[row.status] ?? row.status },
  { header: 'Bloqueio', value: (row) => (row.isBlocked ? 'Bloqueada' : 'Desbloqueada') },
  { header: 'Anjo', value: (row) => row.angel?.name ?? null },
  {
    header: 'Cadastro (%)',
    value: (row) =>
      row.completeness.total
        ? Math.round((row.completeness.filled * 100) / row.completeness.total)
        : 0,
  },
  { header: 'Última validação', value: (row) => row.validation.validatedAt },
  { header: 'Dados desatualizados', value: (row) => (row.isOutdated ? 'Sim' : 'Não') },
];
