import type { CsvColumn } from '../../shared/http/csv.js';
import type { EmployeeRecord } from './employees.service.js';

const AREA_LABEL: Record<string, string> = {
  COMMERCIAL: 'Comercial',
  MEMBER_FINANCE: 'Financeiro do associado',
  TRADE: 'Trade',
  DIGITAL_PRODUCTS: 'Produtos digitais',
  MEMBER_SUCCESS: 'Sucesso do associado',
  OPERATIONS: 'Operações',
};

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: 'Administrador da plataforma',
  PLATFORM_ANALYST: 'Analista da plataforma',
  NONE: 'Sem acesso ao Backoffice',
};

export const EMPLOYEE_CSV_COLUMNS: CsvColumn<EmployeeRecord>[] = [
  { header: 'Nome', value: (row) => row.name },
  { header: 'E-mail', value: (row) => row.email },
  { header: 'Telefone', value: (row) => row.phone },
  { header: 'Área', value: (row) => AREA_LABEL[row.area] ?? row.area },
  { header: 'Cargo', value: (row) => row.jobTitle },
  { header: 'Papel de acesso', value: (row) => ROLE_LABEL[row.accessRole] ?? row.accessRole },
  { header: 'Grupos como Anjo', value: (row) => row.portfolioCount },
  { header: 'Situação', value: (row) => (row.status === 'ACTIVE' ? 'Ativo' : 'Desligado') },
  { header: 'Desligado em', value: (row) => row.terminatedAt },
];
