import { useNavigate } from 'react-router-dom';
import { PillList } from '@/components/ui/Pill';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { cn } from '@/lib/cn';
import { formatGroupNumber, formatNumber, pluralize } from '@/lib/format';
import { GROUP_STATUS } from '../groupStatus';
import type { GroupSummary } from '../types';
import { OwnerSummary, ownerPhoneLabel } from './OwnerSummary';

type GroupsTableProps = {
  groups: GroupSummary[];
  // Seleção para ações em lote (só para quem edita).
  selection?: {
    selected: Set<number>;
    onToggle: (number: number) => void;
    onToggleAll: (numbers: number[]) => void;
  };
};

const checkboxClass =
  'size-4 cursor-pointer accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function GroupsTable({ groups, selection }: GroupsTableProps) {
  const navigate = useNavigate();
  const numbers = groups.map((group) => group.number);
  const allSelected =
    selection !== undefined &&
    numbers.length > 0 &&
    numbers.every((number) => selection.selected.has(number));

  return (
    <Table label="Grupos econômicos" minWidth="1320px">
      <thead>
        <tr>
          {selection && (
            <HeaderCell className="w-10 pr-0">
              <input
                type="checkbox"
                aria-label="Selecionar todos os grupos da página"
                className={checkboxClass}
                checked={allSelected}
                onChange={() => selection.onToggleAll(numbers)}
              />
            </HeaderCell>
          )}
          <HeaderCell title="Emitido pela Farmarcas, não pode ser alterado">GE</HeaderCell>
          <HeaderCell>Grupo</HeaderCell>
          <HeaderCell>Proprietário</HeaderCell>
          <HeaderCell>Telefone</HeaderCell>
          <HeaderCell title="Pessoa da Farmarcas que acompanha o grupo">Anjo</HeaderCell>
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
              {selection && (
                <Cell className="w-10 pr-0">
                  {/* Marcar não abre o grupo: o clique e o Enter param aqui. */}
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${group.name}`}
                    className={checkboxClass}
                    checked={selection.selected.has(group.number)}
                    onChange={() => selection.onToggle(group.number)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.stopPropagation();
                    }}
                  />
                </Cell>
              )}
              <Cell className="font-mono text-[13px] text-secondary-foreground">
                {formatGroupNumber(group.number)}
              </Cell>
              <Cell className="max-w-72">
                <p className="truncate font-semibold">{group.name}</p>
                <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                  {group.badges.includes('NO_OWNER') && (
                    <StatusBadge tone="danger" size="sm">
                      Sem proprietário
                    </StatusBadge>
                  )}
                  {group.badges.includes('NO_ANGEL') && (
                    <StatusBadge tone="warning" size="sm">
                      Sem Anjo
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
              <Cell className="whitespace-nowrap text-[13px]">
                {group.angel ? group.angel.name : <span className="text-muted-foreground">—</span>}
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
