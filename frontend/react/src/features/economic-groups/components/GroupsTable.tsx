import { useNavigate } from 'react-router-dom';
import { PillList } from '@/components/ui/Pill';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { cn } from '@/lib/cn';
import { formatGroupNumber, formatNumber, pluralize } from '@/lib/format';
import { GROUP_STATUS } from '../groupStatus';
import type { GroupSummary } from '../types';
import { OwnerSummary, ownerPhoneLabel } from './OwnerSummary';

type GroupsTableProps = { groups: GroupSummary[] };

export function GroupsTable({ groups }: GroupsTableProps) {
  const navigate = useNavigate();

  return (
    <Table label="Grupos econômicos" minWidth="1180px">
      <thead>
        <tr>
          <HeaderCell title="Emitido pela Farmarcas, não pode ser alterado">GE</HeaderCell>
          <HeaderCell>Grupo</HeaderCell>
          <HeaderCell>Proprietário</HeaderCell>
          <HeaderCell>Telefone</HeaderCell>
          <HeaderCell>Lojas</HeaderCell>
          <HeaderCell>Marcas das lojas</HeaderCell>
          <HeaderCell>Estados</HeaderCell>
          <HeaderCell>Status</HeaderCell>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => {
          const status = GROUP_STATUS[group.status];
          const phone = ownerPhoneLabel(group.owner);
          return (
            <Row
              key={group.number}
              isDimmed={group.status === 'ARCHIVED'}
              onOpen={() => navigate(`/grupos/${group.number}`)}
              openLabel={`Abrir ${group.name}`}
            >
              <Cell className="font-mono text-[13px] text-secondary-foreground">
                {formatGroupNumber(group.number)}
              </Cell>
              <Cell className="max-w-72">
                <p className="truncate font-semibold">{group.name}</p>
                <p className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  {group.badges.includes('NO_OWNER') && (
                    <StatusBadge tone="danger" size="sm">
                      Sem proprietário
                    </StatusBadge>
                  )}
                  {group.badges.includes('OUTDATED_STORES') && (
                    <StatusBadge
                      tone="warning"
                      size="sm"
                      title={`${pluralize(group.outdatedStores, 'loja', 'lojas')} sem revisão do cadastro há mais de 180 dias`}
                    >
                      Lojas desatualizadas
                    </StatusBadge>
                  )}
                  <span className="truncate text-xs text-muted-foreground">{group.legalName}</span>
                </p>
              </Cell>
              <Cell className="max-w-64">
                <OwnerSummary owner={group.owner} />
              </Cell>
              <Cell
                className={cn(
                  'whitespace-nowrap text-[13px]',
                  phone.isMuted ? 'text-muted-foreground' : 'text-secondary-foreground',
                )}
              >
                {phone.text}
              </Cell>
              <Cell>
                <p className="font-semibold">{formatNumber(group.storeCount)}</p>
                <p className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatNumber(group.pdvCount)} PDV · {formatNumber(group.cdCount)} CD
                </p>
              </Cell>
              <Cell>
                <PillList items={group.brands} isOutlined />
              </Cell>
              <Cell>
                <PillList items={group.ufs} />
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
