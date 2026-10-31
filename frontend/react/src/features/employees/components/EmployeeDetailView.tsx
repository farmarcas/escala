import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '@/components/layout/PageTitle';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatGroupNumber, formatPhone, pluralize } from '@/lib/format';
import { useEmployeeDetail } from '../hooks/useEmployeeDetail';
import { ACCESS_ROLE_LABEL, AREA_LABEL, EMPLOYEE_STATUS } from '../labels';
import type { EmployeeDetail, EmployeeStatusAction } from '../types';
import { EmployeeFormModal } from './EmployeeFormModal';
import { EmployeeStatusModal } from './EmployeeStatusModal';

const cardLabel = 'text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground';

const GROUP_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  ARCHIVED: 'Arquivado',
};

type EmployeeDetailViewProps = {
  id: string;
  canEdit: boolean;
  // A trilha é de outra feature: a página entrega pronta.
  renderHistory: (employee: EmployeeDetail) => ReactNode;
};

export function EmployeeDetailView({ id, canEdit, renderHistory }: EmployeeDetailViewProps) {
  const { employee, isLoading, error, reload, update, changeStatus } = useEmployeeDetail(id);
  const [isEditing, setIsEditing] = useState(false);
  const [statusAction, setStatusAction] = useState<EmployeeStatusAction | null>(null);

  if (isLoading) return <LoadingState label="Carregando funcionário" />;
  if (error?.code === 'EMPLOYEE_NOT_FOUND') {
    return (
      <EmptyState
        title="Funcionário não encontrado"
        action={
          <Link
            to="/funcionarios"
            className="text-sm font-semibold text-primary hover:text-primary-hover"
          >
            Ver todos os funcionários
          </Link>
        }
      />
    );
  }
  if (error || !employee) {
    return <ErrorState message={error?.message ?? 'Erro ao carregar'} onRetry={reload} />;
  }

  return (
    <>
      <EmployeeHeader
        employee={employee}
        canEdit={canEdit}
        onEdit={() => setIsEditing(true)}
        onStatusAction={setStatusAction}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="p-5">
          <p className={cardLabel}>Dados</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="truncate">{employee.email}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{employee.phone ? formatPhone(employee.phone) : '—'}</dd>
            <dt className="text-muted-foreground">Área</dt>
            <dd>{AREA_LABEL[employee.area]}</dd>
            <dt className="text-muted-foreground">Cargo</dt>
            <dd>{employee.jobTitle}</dd>
            <dt className="text-muted-foreground">Papel de acesso</dt>
            <dd>{ACCESS_ROLE_LABEL[employee.accessRole]}</dd>
            <dt className="text-muted-foreground">Cadastro</dt>
            <dd>{formatDate(employee.createdAt)}</dd>
            {employee.terminatedAt && (
              <>
                <dt className="text-muted-foreground">Desligado em</dt>
                <dd>{formatDate(employee.terminatedAt)}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card as="section" className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Carteira como Anjo</h2>
            <p className="text-xs text-muted-foreground">
              {employee.portfolio.length
                ? `${pluralize(employee.portfolioCount, 'grupo', 'grupos')} em operação. Para trocar o Anjo, abra o grupo.`
                : 'Ainda não acompanha nenhum grupo. O Anjo é definido no detalhe do grupo.'}
            </p>
          </div>
          {employee.portfolio.length > 0 && (
            <ul className="max-h-[420px] overflow-y-auto">
              {employee.portfolio.map((group) => (
                <li key={group.number}>
                  <Link
                    to={`/grupos/${group.number}`}
                    className="flex items-center gap-3 border-b border-subtle px-5 py-2.5 last:border-b-0 hover:bg-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="w-10 font-mono text-xs text-secondary-foreground">
                      {formatGroupNumber(group.number)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                      {group.name}
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {pluralize(group.storeCount, 'loja', 'lojas')}
                      {group.status !== 'ACTIVE' && ` · ${GROUP_STATUS_LABEL[group.status]}`}
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 text-control" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card as="section" className="overflow-hidden">
        {renderHistory(employee)}
      </Card>

      <EmployeeFormModal
        isOpen={isEditing}
        employee={employee}
        onClose={() => setIsEditing(false)}
        onUpdate={update}
      />
      <EmployeeStatusModal
        employee={employee}
        action={statusAction}
        onClose={() => setStatusAction(null)}
        onConfirm={changeStatus}
      />
    </>
  );
}

type EmployeeHeaderProps = {
  employee: EmployeeDetail;
  canEdit: boolean;
  onEdit: () => void;
  onStatusAction: (action: EmployeeStatusAction) => void;
};

function EmployeeHeader({ employee, canEdit, onEdit, onStatusAction }: EmployeeHeaderProps) {
  const navigate = useNavigate();
  const status = EMPLOYEE_STATUS[employee.status];
  usePageTitle(employee.name);

  return (
    <div className="flex flex-col gap-3">
      <Link
        to="/funcionarios"
        onClick={(event) => {
          if (window.history.state?.idx > 0) {
            event.preventDefault();
            navigate(-1);
          }
        }}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-secondary-foreground hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="sr-only">{employee.name}</h1>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <span className="text-sm text-muted-foreground">
          {AREA_LABEL[employee.area]} · {employee.jobTitle}
        </span>
        <div className="flex-1" />
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onEdit}>
              Editar
            </Button>
            {employee.status === 'ACTIVE' ? (
              <Button variant="danger-outline" onClick={() => onStatusAction('terminate')}>
                Desligar
              </Button>
            ) : (
              <Button onClick={() => onStatusAction('rehire')}>Religar</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
