import { useNavigate } from 'react-router-dom';
import { ValidationCell } from '@/components/ui/GovernanceCells';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { cn } from '@/lib/cn';
import { formatCnpj, formatGroupNumber } from '@/lib/format';
import { completenessPercent } from '@/lib/governance';
import { STORE_STAGE, STORE_STATUS } from '../storeLabels';
import type { Store } from '../types';

const checkboxClass =
  'size-4 cursor-pointer accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

// Cores do avatar do Anjo: a mesma pessoa sempre com a mesma cor.
const AVATAR = [
  'bg-primary-soft text-primary-hover',
  'bg-selected text-selected-foreground',
  'bg-success-soft text-success-text',
  'bg-info-soft text-info-text',
];

const avatarOf = (name: string) =>
  AVATAR[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR.length];

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

type StoresTableProps = {
  stores: Store[];
  selected: Set<number>;
  onToggle: (store: Store) => void;
  onTogglePage: () => void;
};

// Tabela da lista de lojas, nas colunas do protótipo (Lojas Lista).
export function StoresTable({ stores, selected, onToggle, onTogglePage }: StoresTableProps) {
  const navigate = useNavigate();
  const isPageSelected = stores.length > 0 && stores.every((store) => selected.has(store.code));

  return (
    // Colunas mais justas que o padrão: cabem as dez do protótipo numa tela de 1440 px.
    <div className="[&_td:first-child]:pl-5 [&_td]:px-2 [&_th:first-child]:pl-5 [&_th]:px-2">
      <Table label="Lojas da rede" minWidth="1100px">
        <thead>
          <tr>
            <HeaderCell className="w-10 pr-0">
              <input
                type="checkbox"
                aria-label="Selecionar todas as lojas da página"
                className={checkboxClass}
                checked={isPageSelected}
                onChange={onTogglePage}
              />
            </HeaderCell>
            <HeaderCell>GE</HeaderCell>
            <HeaderCell>Bandeira</HeaderCell>
            <HeaderCell>Razão social</HeaderCell>
            <HeaderCell title="Pessoa da Farmarcas que acompanha o grupo da loja">Anjo</HeaderCell>
            <HeaderCell title="Etapa da loja na rede">Status</HeaderCell>
            <HeaderCell>Situação</HeaderCell>
            <HeaderCell title="Loja bloqueada: o grupo perde o acesso a ela">Bloqueio</HeaderCell>
            <HeaderCell>Cadastro</HeaderCell>
            <HeaderCell>Validação</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => {
            const isSelected = selected.has(store.code);
            const stage = STORE_STAGE[store.stage];
            const status = STORE_STATUS[store.status];
            return (
              <Row
                key={store.id}
                isDimmed={store.status === 'INACTIVE'}
                onOpen={() => navigate(`/lojas/${store.code}`)}
                openLabel={`Abrir ${store.name}`}
              >
                <Cell className={cn('w-10 pr-0', isSelected && 'bg-primary-tint')}>
                  {/* Marcar não abre a loja: o clique e o Enter param aqui. */}
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${store.name}`}
                    className={checkboxClass}
                    checked={isSelected}
                    onChange={() => onToggle(store)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.stopPropagation();
                    }}
                  />
                </Cell>
                <Cell
                  className={cn(
                    'font-mono text-[13px] font-semibold',
                    isSelected && 'bg-primary-tint',
                  )}
                >
                  <span title={store.groupName}>{formatGroupNumber(store.groupNumber)}</span>
                </Cell>
                <Cell
                  className={cn(
                    'max-w-28 truncate font-semibold text-secondary-foreground',
                    isSelected && 'bg-primary-tint',
                  )}
                >
                  {store.brand.name}
                </Cell>
                <Cell className={cn('max-w-48', isSelected && 'bg-primary-tint')}>
                  <p className="truncate text-[11px] uppercase text-muted-foreground">
                    {store.city}, {store.uf} · {store.type}
                  </p>
                  <p className="truncate font-semibold">{store.legalName ?? store.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {formatCnpj(store.cnpj)}
                  </p>
                </Cell>
                <Cell className={cn(isSelected && 'bg-primary-tint')}>
                  {store.angel ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                          avatarOf(store.angel.name),
                        )}
                      >
                        {initials(store.angel.name)}
                      </span>
                      <span className="max-w-20 truncate text-xs" title={store.angel.name}>
                        {store.angel.name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem Anjo</span>
                  )}
                </Cell>
                <Cell className={cn(isSelected && 'bg-primary-tint')}>
                  <StatusBadge tone={stage.tone}>{stage.label}</StatusBadge>
                </Cell>
                <Cell className={cn(isSelected && 'bg-primary-tint')}>
                  {/* "Pendente no grupo" fica só "Pendente" na tabela; o texto todo vai na dica. */}
                  <StatusBadge
                    tone={status.tone}
                    title={status.title ? `${status.label}. ${status.title}` : status.label}
                  >
                    {store.status === 'PENDING' ? 'Pendente' : status.label}
                  </StatusBadge>
                </Cell>
                <Cell className={cn(isSelected && 'bg-primary-tint')}>
                  {store.isBlocked ? (
                    <StatusBadge tone="dark" title={store.blockedReason ?? undefined}>
                      Bloqueada
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="success">Desbloqueada</StatusBadge>
                  )}
                </Cell>
                <Cell className={cn(isSelected && 'bg-primary-tint')}>
                  <CompletenessRing {...store.completeness} />
                </Cell>
                <Cell className={cn(isSelected && 'bg-primary-tint')}>
                  <ValidationCell
                    status={store.validation.status}
                    days={store.validation.days}
                    validatedAt={store.validation.validatedAt}
                  />
                </Cell>
              </Row>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

// Anel do preenchimento com a porcentagem e quantos campos faltam (protótipo).
function CompletenessRing({
  filled,
  total,
  missing,
}: {
  filled: number;
  total: number;
  missing?: string[];
}) {
  const percent = completenessPercent(filled, total);
  const color =
    percent >= 100
      ? 'var(--color-success)'
      : percent >= 80
        ? 'var(--color-warning)'
        : 'var(--color-destructive)';
  const text =
    percent >= 100
      ? 'text-success-text'
      : percent >= 80
        ? 'text-warning-text'
        : 'text-destructive-text';
  const empty = Math.max(0, total - filled);
  return (
    <div
      className="flex min-w-0 items-center gap-2"
      title={missing?.length ? `Falta: ${missing.join(', ')}` : 'Todos os campos preenchidos'}
    >
      <span
        aria-hidden="true"
        className="flex size-[26px] shrink-0 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} 0 ${percent}%, var(--color-subtle) ${percent}% 100%)`,
        }}
      >
        <span className="size-4 rounded-full bg-surface" />
      </span>
      <span className="min-w-0">
        <span className={cn('block font-bold', text)}>{percent}%</span>
        <span className="block whitespace-nowrap text-[11px] text-muted-foreground">
          {empty === 0
            ? 'Tudo preenchido'
            : `${empty} ${empty > 1 ? 'campos vazios' : 'campo vazio'}`}
        </span>
      </span>
    </div>
  );
}
