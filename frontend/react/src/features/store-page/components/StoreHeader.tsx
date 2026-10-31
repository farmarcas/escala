import { Link } from 'react-router-dom';
import { ArrowLeft, FilePlus2, Lock, Pencil } from 'lucide-react';
import { usePageTitle } from '@/components/layout/PageTitle';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatGroupNumber, formatStoreCode } from '@/lib/format';
import { STAGE_LABEL, STORE_STATUS_LABEL } from '../labels';
import type { StorePage } from '../types';

type StoreHeaderProps = {
  page: StorePage;
  backTo: string;
  backLabel: string;
  isEditing: boolean;
  onEdit: () => void;
  onNewRequest: () => void;
  // Só a Farmarcas (administrador): etapa e bloqueio.
  onChangeStage: () => void;
  onToggleBlock: () => void;
};

export function StoreHeader({
  page,
  backTo,
  backLabel,
  isEditing,
  onEdit,
  onNewRequest,
  onChangeStage,
  onToggleBlock,
}: StoreHeaderProps) {
  const status = STORE_STATUS_LABEL[page.status] ?? STORE_STATUS_LABEL.ACTIVE!;
  const stage = STAGE_LABEL[page.stage];
  const canManage = page.side === 'platform' && !page.isReadOnly;
  usePageTitle(page.basic.name ?? page.receita.legalName ?? undefined);
  const sideText =
    page.side === 'tenant'
      ? 'Visão do grupo'
      : page.isReadOnly
        ? 'Visão Farmarcas · só leitura'
        : 'Visão Farmarcas';

  return (
    <div className="flex flex-col gap-3">
      <Link
        to={backTo}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-secondary-foreground hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="sr-only">{page.basic.name ?? page.receita.legalName}</h1>
        <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-secondary-foreground">
          {formatStoreCode(page.code)}
        </span>
        <StatusBadge tone={page.type === 'CD' ? 'info' : 'neutral'} size="sm">
          {page.type}
        </StatusBadge>
        {stage && (
          <StatusBadge tone={stage.tone} title="Etapa da loja na rede">
            {stage.label}
          </StatusBadge>
        )}
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {page.block && <StatusBadge tone="danger">Bloqueada</StatusBadge>}
        <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
          {sideText}
        </span>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <>
              <Button variant="secondary" onClick={onChangeStage}>
                Mudar etapa
              </Button>
              <Button variant={page.block ? 'secondary' : 'danger-outline'} onClick={onToggleBlock}>
                <Lock aria-hidden="true" className="size-4" />
                {page.block ? 'Desbloquear' : 'Bloquear loja'}
              </Button>
            </>
          )}
          {page.permissions.canEditBasic && !isEditing && (
            <Button variant="secondary" onClick={onEdit}>
              <Pencil aria-hidden="true" className="size-4" />
              Editar dados básicos
            </Button>
          )}
          {page.permissions.canOpenRequest && (
            <Button onClick={onNewRequest}>
              <FilePlus2 aria-hidden="true" className="size-4" />
              Nova solicitação
            </Button>
          )}
        </div>
      </div>
      {page.block && (
        <p
          role="status"
          className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-2.5 text-[13px] text-destructive-text"
        >
          Loja bloqueada em {formatDate(page.block.at)}
          {page.block.by ? ` por ${page.block.by}` : ''}. O grupo não consegue abrir nem alterar
          esta loja. Motivo: {page.block.reason ?? '—'}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {page.receita.legalName ?? 'Razão social não informada'} · {page.group.name} · GE{' '}
        {formatGroupNumber(page.group.number)}
        {page.group.status !== 'ACTIVE' &&
          page.side === 'tenant' &&
          ' · grupo suspenso ou arquivado: só leitura'}
      </p>
    </div>
  );
}
