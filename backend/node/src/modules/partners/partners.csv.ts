import type { CsvColumn } from '../../shared/http/csv.js';
import type { PartnerRecord } from './partners.service.js';

const cnpj = (value: string) =>
  value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

export const PARTNER_CSV_COLUMNS: CsvColumn<PartnerRecord>[] = [
  { header: 'Parceiro', value: (row) => row.tradeName },
  { header: 'Razão social', value: (row) => row.legalName },
  { header: 'Tipo', value: (row) => (row.type === 'INDUSTRY' ? 'Indústria' : 'Distribuidor') },
  { header: 'CNPJ', value: (row) => cnpj(row.cnpj) },
  { header: 'Situação', value: (row) => (row.status === 'ACTIVE' ? 'Ativo' : 'Inativo') },
  { header: 'Contato principal', value: (row) => row.primaryContact?.name ?? null },
  { header: 'Cargo', value: (row) => row.primaryContact?.jobTitle ?? null },
  { header: 'E-mail', value: (row) => row.primaryContact?.email ?? null },
  { header: 'Telefone', value: (row) => row.primaryContact?.phone ?? null },
  { header: 'Contatos', value: (row) => row.contactCount },
];
