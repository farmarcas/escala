import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { cn } from '@/lib/cn';
import { formatNumber, formatPhone, pluralize } from '@/lib/format';
import type { GroupDetail } from '../types';

type GroupSummaryCardsProps = { group: GroupDetail };

const cardLabel = 'text-xs font-bold uppercase tracking-[0.4px] text-muted-foreground';

function OwnerCard({ group }: GroupSummaryCardsProps) {
  const owner = group.owner;
  return (
    <Card className="p-5">
      <p className={cardLabel}>Proprietário</p>
      {!owner && (
        <div className="mt-3">
          <p className="font-semibold text-destructive">Não cadastrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre o proprietário em Editar grupo.
          </p>
        </div>
      )}
      {owner && !owner.name && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <p className="font-mono text-lg font-semibold">{owner.pseudonym}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Departamento Sócio · primeiro administrador
            </p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="text-muted-foreground">Pseudonimizado</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd className="text-muted-foreground">Pseudonimizado</dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            Dados pessoais visíveis só para o Administrador da plataforma.
          </p>
        </div>
      )}
      {owner?.name && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-hover"
            >
              {owner.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{owner.name}</p>
              <p className="text-xs text-muted-foreground">
                Departamento Sócio · primeiro administrador · código {owner.pseudonym}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="truncate">{owner.email}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{owner.phone ? formatPhone(owner.phone) : '—'}</dd>
          </dl>
        </div>
      )}
    </Card>
  );
}

type AngelCardProps = { group: GroupDetail; canEdit: boolean; onChooseAngel: () => void };

// Anjo: pessoa da Farmarcas que acompanha o grupo (spec 003, US2).
function AngelCard({ group, canEdit, onChooseAngel }: AngelCardProps) {
  const angel = group.angel;
  const canChange = canEdit && group.status !== 'ARCHIVED';
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-2">
        <p className={cn(cardLabel, 'flex-1')}>Anjo Farmarcas</p>
        {canChange && (
          <Button variant="link" size="sm" className="h-auto" onClick={onChooseAngel}>
            {angel ? 'Trocar Anjo' : 'Definir Anjo'}
          </Button>
        )}
      </div>
      {!angel && (
        <div className="mt-3">
          <p className="font-semibold text-warning-text">Sem Anjo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {group.status === 'ARCHIVED'
              ? 'Grupo arquivado não precisa de Anjo.'
              : 'Ninguém da Farmarcas acompanha este grupo ainda. Chamados e planos do Gestão 360 ficam sem responsável.'}
          </p>
        </div>
      )}
      {angel && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-selected text-sm font-bold text-selected-foreground"
            >
              {initials(angel.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{angel.name}</p>
              <p className="text-xs text-muted-foreground">{angel.jobTitle}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="truncate">{angel.email}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{angel.phone ? formatPhone(angel.phone) : '—'}</dd>
          </dl>
        </div>
      )}
    </Card>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

function StoresCard({ group }: GroupSummaryCardsProps) {
  return (
    <Card className="p-5">
      <p className={cardLabel}>Lojas</p>
      <p className="mt-2 text-[28px] font-bold leading-[1.1]">{formatNumber(group.storeCount)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {pluralize(group.activeStores, 'ativa', 'ativas')} ·{' '}
        {pluralize(group.inactiveStores, 'inativa', 'inativas')}
        {group.pendingStores > 0 &&
          ` · ${pluralize(group.pendingStores, 'pendente', 'pendentes')} no grupo`}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill>PDV · {formatNumber(group.pdvCount)}</Pill>
        <Pill>CD · {formatNumber(group.cdCount)}</Pill>
        {group.brandsBreakdown.map((brand) => (
          <Pill key={brand.name} isOutlined>
            {brand.name} · {formatNumber(brand.count)}
          </Pill>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Marcas derivadas das lojas</p>
    </Card>
  );
}

function StatesCard({ group }: GroupSummaryCardsProps) {
  return (
    <Card className="p-5">
      <p className={cardLabel}>Estados de atuação</p>
      <p className="mt-2 text-[28px] font-bold leading-[1.1]">
        {formatNumber(group.ufsBreakdown.length)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {group.ufsBreakdown.length === 0 && (
          <span className="text-xs text-muted-foreground">Nenhuma loja cadastrada ainda</span>
        )}
        {group.ufsBreakdown.map((item) => (
          <Pill key={item.uf}>
            {item.uf} · {formatNumber(item.count)}
          </Pill>
        ))}
      </div>
    </Card>
  );
}

export function GroupSummaryCards({ group, canEdit, onChooseAngel }: AngelCardProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
      <OwnerCard group={group} />
      <AngelCard group={group} canEdit={canEdit} onChooseAngel={onChooseAngel} />
      <StoresCard group={group} />
      <StatesCard group={group} />
    </div>
  );
}
