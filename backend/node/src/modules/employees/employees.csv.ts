import type { CsvColumn } from '../../shared/http/csv.js';
import { formatPhone, GENDER_LABEL } from './changes-summary.js';
import type { EmployeeRecord } from './employees.repository.js';
import { ROLE_LABEL, systemLabel } from './suite-systems.js';

export const EMPLOYEE_CSV_COLUMNS: CsvColumn<EmployeeRecord>[] = [
  { header: 'Nome', value: (row) => row.name },
  { header: 'E-mail', value: (row) => row.email },
  { header: 'Gênero', value: (row) => (row.gender ? (GENDER_LABEL[row.gender] ?? null) : null) },
  { header: 'Celular', value: (row) => (row.mobile ? formatPhone(row.mobile) : null) },
  { header: 'Telefone fixo', value: (row) => (row.landline ? formatPhone(row.landline) : null) },
  { header: 'Departamento', value: (row) => row.department.name },
  { header: 'Ocupação', value: (row) => row.occupation.name },
  {
    header: 'Acessos',
    value: (row) =>
      row.accesses
        .map((access) => `${systemLabel(access.system)}: ${ROLE_LABEL[access.role]}`)
        .join('; ') || 'Sem acesso',
  },
  { header: 'Grupos como Anjo', value: (row) => row.portfolioCount },
  { header: 'Situação', value: (row) => (row.status === 'ACTIVE' ? 'Ativo' : 'Desligado') },
  { header: 'Desligado em', value: (row) => row.terminatedAt },
];
