import type { CsvColumn } from '../../shared/http/csv.js';
import type { toGroupSummaryView } from './economic-groups.service.js';

type GroupRow = ReturnType<typeof toGroupSummaryView>;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  ARCHIVED: 'Arquivado',
};

const BADGE_LABEL: Record<string, string> = {
  NO_OWNER: 'Sem proprietário',
  NO_ANGEL: 'Sem Anjo',
  OUTDATED_STORES: 'Lojas desatualizadas',
};

// Mesma pseudonimização da tela: o analista recebe o proprietário só por código.
export const GROUP_CSV_COLUMNS: CsvColumn<GroupRow>[] = [
  { header: 'GE', value: (row) => String(row.number).padStart(4, '0') },
  { header: 'Grupo', value: (row) => row.name },
  { header: 'Razão social', value: (row) => row.legalName },
  { header: 'Status', value: (row) => STATUS_LABEL[row.status] ?? row.status },
  { header: 'Código do proprietário', value: (row) => row.owner?.pseudonym ?? null },
  {
    header: 'Proprietário',
    value: (row) => (row.owner ? (row.owner.name ?? 'Pseudonimizado') : null),
  },
  { header: 'E-mail', value: (row) => (row.owner ? (row.owner.email ?? 'Pseudonimizado') : null) },
  {
    header: 'Telefone',
    value: (row) => (row.owner ? (row.owner.phone ?? 'Pseudonimizado') : null),
  },
  { header: 'Anjo', value: (row) => row.angel?.name ?? null },
  { header: 'Lojas', value: (row) => row.storeCount },
  { header: 'PDV', value: (row) => row.pdvCount },
  { header: 'CD', value: (row) => row.cdCount },
  { header: 'Marcas', value: (row) => row.brands.join(', ') },
  { header: 'Estados', value: (row) => row.ufs.join(', ') },
  { header: 'Selos', value: (row) => row.badges.map((badge) => BADGE_LABEL[badge]).join(', ') },
];
