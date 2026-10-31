import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageTitle } from '@/components/layout/PageTitle';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCnpj, formatGroupNumber } from '@/lib/format';
import { GROUP_STATUS } from '../groupStatus';
import type { GroupDetail, StatusAction } from '../types';

type GroupHeaderProps = {
  group: GroupDetail;
  canEdit: boolean;
  onEdit: () => void;
  onStatusAction: (action: StatusAction) => void;
  onAddStore: () => void;
};

export function GroupHeader({
  group,
  canEdit,
  onEdit,
  onStatusAction,
  onAddStore,
}: GroupHeaderProps) {
  const navigate = useNavigate();
  const status = GROUP_STATUS[group.status];
  usePageTitle(group.name);

  return (
    <div className="flex flex-col gap-3">
      {/* Volta para a tela anterior (ex.: a lista de lojas); sem histórico, vai para os grupos. */}
      <Link
        to="/grupos"
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
        <h1 className="sr-only">{group.name}</h1>
        <span
          title="Emitido pela Farmarcas, não pode ser alterado"
          className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-secondary-foreground"
        >
          GE {formatGroupNumber(group.number)}
        </span>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {group.badges.includes('NO_OWNER') && (
          <StatusBadge tone="danger">Sem proprietário</StatusBadge>
        )}
        {group.badges.includes('NO_ANGEL') && <StatusBadge tone="warning">Sem Anjo</StatusBadge>}
        <div className="flex-1" />
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {group.status !== 'ARCHIVED' && (
              <Button variant="secondary" onClick={onAddStore}>
                Adicionar loja
              </Button>
            )}
            <Button variant="secondary" onClick={onEdit}>
              Editar grupo
            </Button>
            {group.status === 'ACTIVE' && (
              <Button variant="danger-outline" onClick={() => onStatusAction('suspend')}>
                Suspender tenant
              </Button>
            )}
            {group.status !== 'ARCHIVED' && (
              <Button variant="secondary" onClick={() => onStatusAction('archive')}>
                Arquivar
              </Button>
            )}
            {group.status !== 'ACTIVE' && (
              <Button onClick={() => onStatusAction('restore')}>Restaurar</Button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Número do GE emitido pela Farmarcas, não pode ser alterado. Razão social: {group.legalName}
        {' · '}CNPJ da matriz {formatCnpj(group.cnpj)}.
      </p>
    </div>
  );
}
