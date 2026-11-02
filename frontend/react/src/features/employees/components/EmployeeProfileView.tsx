import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { usePageTitle } from '@/components/layout/PageTitle';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { useEmployeeDetail, useEmployeeOptions } from '../hooks/useEmployeeDetail';
import { EMPLOYEE_STATUS } from '../labels';
import type { EmployeeDetail, EmployeeStatusAction } from '../types';
import { AccessTab } from './AccessTab';
import { EmployeeStatusModal } from './EmployeeStatusModal';
import { GeneralDataTab } from './GeneralDataTab';

type Tab = 'general' | 'access';

const TABS: { value: Tab; label: string }[] = [
  { value: 'general', label: 'Dados gerais' },
  { value: 'access', label: 'Sistemas e acesso' },
];

type EmployeeProfileViewProps = {
  id: string;
  canEdit: boolean;
  // A trilha é de outra feature: a página entrega pronta.
  renderHistory: (employee: EmployeeDetail) => ReactNode;
};

// Perfil do usuário (tela do sistema legado com o visual atual; spec 005).
export function EmployeeProfileView({ id, canEdit, renderHistory }: EmployeeProfileViewProps) {
  const { employee, isLoading, error, reload, update, changeStatus, setAccess } =
    useEmployeeDetail(id);
  const { options } = useEmployeeOptions();
  const [tab, setTab] = useState<Tab>('general');
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
      <ProfileHeader employee={employee} canEdit={canEdit} onStatusAction={setStatusAction} />
      <Tabs label="Perfil do usuário" tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'general' ? (
        <GeneralDataTab
          employee={employee}
          options={options}
          canEdit={canEdit}
          onSave={update}
          onReload={reload}
          history={renderHistory(employee)}
        />
      ) : (
        <AccessTab employee={employee} options={options} canEdit={canEdit} onChange={setAccess} />
      )}
      <EmployeeStatusModal
        employee={employee}
        action={statusAction}
        onClose={() => setStatusAction(null)}
        onConfirm={changeStatus}
      />
    </>
  );
}

// Cor da inicial: muda com a letra, sempre a mesma para a mesma pessoa.
const AVATAR_TONES = ['bg-warning', 'bg-primary', 'bg-success', 'bg-info-text'];

type ProfileHeaderProps = {
  employee: EmployeeDetail;
  canEdit: boolean;
  onStatusAction: (action: EmployeeStatusAction) => void;
};

function ProfileHeader({ employee, canEdit, onStatusAction }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const status = EMPLOYEE_STATUS[employee.status];
  const initial = employee.name.trim().charAt(0).toUpperCase();
  usePageTitle(employee.name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          to="/funcionarios"
          onClick={(event) => {
            if (window.history.state?.idx > 0) {
              event.preventDefault();
              navigate(-1);
            }
          }}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-secondary-foreground hover:text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </Link>
        <p className="text-base font-semibold">Perfil do usuário</p>
        <div
          aria-label="Tipo de perfil"
          title="Funcionários são sempre colaboradores da Farmarcas"
          className="flex h-10 min-w-56 items-center justify-between gap-3 rounded-md border border-border bg-subtle px-3.5 text-sm text-secondary-foreground"
        >
          Colaborador Farmarcas
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-subtle px-5 py-4">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white',
            AVATAR_TONES[initial.charCodeAt(0) % AVATAR_TONES.length],
          )}
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="truncate text-lg font-semibold">{employee.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {employee.occupation.name} · {employee.department.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          {canEdit &&
            (employee.status === 'ACTIVE' ? (
              <Button variant="danger-outline" onClick={() => onStatusAction('terminate')}>
                Desligar
              </Button>
            ) : (
              <Button onClick={() => onStatusAction('rehire')}>Religar</Button>
            ))}
        </div>
      </div>
    </div>
  );
}
