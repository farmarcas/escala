import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { formatNumber } from '@/lib/format';
import { EMPLOYEE_STATUS, ROLE_LABEL, ROLE_TONE, SYSTEM_LABEL } from '../labels';
import type { Employee } from '../types';

type EmployeesTableProps = { employees: Employee[] };

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const navigate = useNavigate();
  return (
    <Table label="Funcionários da Farmarcas" minWidth="1040px">
      <thead>
        <tr>
          <HeaderCell>Funcionário</HeaderCell>
          <HeaderCell>Departamento</HeaderCell>
          <HeaderCell>Ocupação</HeaderCell>
          <HeaderCell>Acessos</HeaderCell>
          <HeaderCell isNumeric title="Grupos em operação que a pessoa acompanha como Anjo">
            Grupos como Anjo
          </HeaderCell>
          <HeaderCell>Situação</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => {
          const status = EMPLOYEE_STATUS[employee.status];
          const accesses = employee.status === 'ACTIVE' ? employee.accesses : [];
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
              <Cell className="text-secondary-foreground">{employee.department.name}</Cell>
              <Cell className="text-secondary-foreground">{employee.occupation.name}</Cell>
              <Cell>
                {accesses.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">Sem acesso</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {accesses.map((access) => (
                      <StatusBadge key={access.system} tone={ROLE_TONE[access.role]} size="sm">
                        {SYSTEM_LABEL[access.system]} · {ROLE_LABEL[access.role]}
                      </StatusBadge>
                    ))}
                  </div>
                )}
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
