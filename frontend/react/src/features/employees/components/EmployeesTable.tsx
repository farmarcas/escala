import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { formatNumber } from '@/lib/format';
import { ACCESS_ROLE_LABEL, AREA_LABEL, EMPLOYEE_STATUS } from '../labels';
import type { Employee } from '../types';

type EmployeesTableProps = { employees: Employee[] };

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const navigate = useNavigate();
  return (
    <Table label="Funcionários da Farmarcas" minWidth="980px">
      <thead>
        <tr>
          <HeaderCell>Funcionário</HeaderCell>
          <HeaderCell>Área</HeaderCell>
          <HeaderCell>Cargo</HeaderCell>
          <HeaderCell>Papel de acesso</HeaderCell>
          <HeaderCell isNumeric title="Grupos em operação que a pessoa acompanha como Anjo">
            Grupos como Anjo
          </HeaderCell>
          <HeaderCell>Situação</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => {
          const status = EMPLOYEE_STATUS[employee.status];
          return (
            <Row
              key={employee.id}
              isDimmed={employee.status === 'TERMINATED'}
              onOpen={() => navigate(`/funcionarios/${employee.id}`)}
              openLabel={`Abrir ${employee.name}`}
            >
              <Cell className="max-w-72">
                <p className="truncate font-semibold">{employee.name}</p>
                <p className="truncate text-xs text-muted-foreground">{employee.email}</p>
              </Cell>
              <Cell className="text-secondary-foreground">{AREA_LABEL[employee.area]}</Cell>
              <Cell className="text-secondary-foreground">{employee.jobTitle}</Cell>
              <Cell className="whitespace-nowrap text-[13px] text-secondary-foreground">
                {ACCESS_ROLE_LABEL[employee.accessRole]}
              </Cell>
              <Cell isNumeric className="font-semibold">
                {employee.portfolioCount ? formatNumber(employee.portfolioCount) : '—'}
              </Cell>
              <Cell>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </Cell>
            </Row>
          );
        })}
      </tbody>
    </Table>
  );
}
