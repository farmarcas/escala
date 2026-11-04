import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InlineAlert } from '@/components/ui/States';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { useMutation } from '@/hooks/useMutation';
import { formatBrl, parseBrlToCents } from '@/lib/format';
import type { Catalog } from '../hooks/useCatalog';
import type { useStorePage } from '../hooks/useStorePage';
import type { StorePage } from '../types';
import { InactiveTag } from './CheckItem';
import { UsesToggle, usesText, usesTone } from './UsesToggle';

type Line = {
  key: string;
  itemId?: string;
  customId?: string;
  name: string;
  isInactive?: boolean;
  category: string;
  negotiatedCents: number | null;
  negotiatedNote: string | null;
  uses: boolean | null;
  costCents: number | null;
};

type Filter = 'all' | 'uses' | 'negotiated';

const yearlySavings = (line: Line) =>
  line.uses && line.negotiatedCents !== null
    ? Math.max(0, (line.costCents ?? 0) - line.negotiatedCents) * 12
    : 0;

type SystemsTabProps = {
  page: StorePage;
  catalog: Catalog;
  actions: ReturnType<typeof useStorePage>;
};

// Ferramentas externas: o grupo informa uso e custo; a Farmarcas acompanha e negocia (US8).
export function SystemsTab({ page, catalog, actions }: SystemsTabProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const canEdit = page.permissions.canEditTools;
  const declare = useMutation();

  const lines: Line[] = [
    ...catalog
      .byKind(
        'EXTERNAL_TOOL',
        page.tools.filter((tool) => tool.uses).map((tool) => tool.itemId),
      )
      .map((item) => {
        const answer = page.tools.find((tool) => tool.itemId === item.id);
        return {
          key: item.id,
          itemId: item.id,
          name: item.name,
          isInactive: !item.active,
          category: item.groupLabel ?? 'Categoria a definir',
          negotiatedCents: item.negotiatedMonthlyCents,
          negotiatedNote: item.description,
          uses: answer ? answer.uses : null,
          costCents: answer?.monthlyCostCents ?? null,
        };
      }),
    ...page.customEntries
      .filter((entry) => entry.kind === 'EXTERNAL_TOOL')
      .map((entry) => ({
        key: entry.id,
        customId: entry.id,
        name: entry.name,
        category: entry.category ?? 'Sem categoria',
        negotiatedCents: null,
        negotiatedNote: null,
        uses: true,
        costCents: entry.monthlyCostCents,
      })),
  ];
  const inUse = lines.filter((line) => line.uses);
  const monthly = inUse.reduce((sum, line) => sum + (line.costCents ?? 0), 0);
  const negotiated = lines.filter((line) => line.negotiatedCents !== null);
  const savings = lines.reduce((sum, line) => sum + yearlySavings(line), 0);
  const visible = lines.filter(
    (line) =>
      filter === 'all' ||
      (filter === 'uses' && line.uses) ||
      (filter === 'negotiated' && line.negotiatedCents !== null),
  );

  return (
    <div className="flex flex-col gap-4 py-5">
      <div className="px-5">
        <h2 className="text-base font-semibold">Ferramentas externas</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {page.side === 'platform'
            ? 'Preenchido pelo grupo · a Farmarcas acompanha e mantém o catálogo e as negociações'
            : 'Marque o que a loja usa e quanto paga por mês · inclua outras ferramentas se não estiverem na lista'}
        </p>
        <KpiGrid>
          <KpiCard
            label="Ferramentas em uso"
            value={String(inUse.length)}
            context={
              page.noExternalTools
                ? 'Grupo declarou que não usa'
                : `${lines.length} no catálogo e incluídas`
            }
          />
          <KpiCard
            label="Custo operacional"
            value={formatBrl(monthly)}
            suffix="por mês"
            context={`${formatBrl(monthly * 12)} por ano`}
          />
          <KpiCard
            label="Negociação Farmarcas"
            value={`${negotiated.filter((line) => line.uses).length} de ${negotiated.length}`}
            context="Ferramentas com condição central em uso"
          />
          <KpiCard
            label="Economia possível"
            value={formatBrl(savings)}
            suffix="por ano"
            context={
              savings > 0
                ? 'Migrando para a condição Farmarcas'
                : 'Nenhuma ferramenta acima da condição'
            }
            isCritical={savings > 0}
          />
        </KpiGrid>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-y border-border px-5 py-3">
        <SegmentedControl<Filter>
          label="Filtrar ferramentas"
          value={filter}
          onChange={setFilter}
          segments={[
            { value: 'all', label: 'Todas' },
            { value: 'uses', label: 'Em uso' },
            { value: 'negotiated', label: 'Com negociação' },
          ]}
        />
        {(inUse.length === 0 || page.noExternalTools) && (
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              disabled={!canEdit || declare.isPending}
              checked={page.noExternalTools}
              onChange={(event) =>
                declare.run(() => actions.setNoExternalTools(event.target.checked))
              }
              className="accent-primary"
            />
            A loja não utiliza ferramentas externas
          </label>
        )}
      </div>

      <Table label="Ferramentas externas" minWidth="900px">
        <thead>
          <tr>
            <HeaderCell>Ferramenta</HeaderCell>
            <HeaderCell>Utiliza?</HeaderCell>
            <HeaderCell isNumeric>Custo mensal</HeaderCell>
            <HeaderCell isNumeric>{canEdit ? 'Ações' : ''}</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {visible.map((line) => (
            <ToolRow key={line.key} line={line} canEdit={canEdit} actions={actions} />
          ))}
        </tbody>
      </Table>
      {visible.length === 0 && (
        <p className="px-5 text-sm text-muted-foreground">Nenhuma ferramenta neste filtro</p>
      )}
      {canEdit && filter !== 'negotiated' && <AddToolForm actions={actions} />}
      <p className="px-5 text-xs text-muted-foreground">
        Catálogo e negociações centrais definidos pela Farmarcas · valores de negociação são
        exemplos · cada mudança entra no histórico
      </p>
    </div>
  );
}

function ToolRow({
  line,
  canEdit,
  actions,
}: {
  line: Line;
  canEdit: boolean;
  actions: ReturnType<typeof useStorePage>;
}) {
  const [draft, setDraft] = useState<{ uses: boolean | null; cost: string } | null>(null);
  const { run, isPending, error } = useMutation();
  const savings = yearlySavings(line);

  const save = async () => {
    if (!draft || draft.uses === null) return;
    const cost = draft.uses ? (parseBrlToCents(draft.cost) ?? 0) : null;
    const ok = await run(() =>
      line.customId
        ? draft.uses
          ? actions.updateCustomEntry(line.customId!, { monthlyCostCents: cost })
          : actions.removeCustomEntry(line.customId!)
        : actions.setTool(line.itemId!, draft.uses!, cost),
    );
    if (ok) setDraft(null);
  };

  return (
    <Row>
      <Cell>
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {line.name}
          {line.isInactive && <InactiveTag />}
          {line.negotiatedCents !== null && (
            <StatusBadge tone="brand" size="sm" title={line.negotiatedNote ?? undefined}>
              Negociação Farmarcas
            </StatusBadge>
          )}
          {line.customId && (
            <StatusBadge tone="neutral" size="sm">
              Incluída pelo grupo
            </StatusBadge>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{line.category}</p>
        {savings > 0 && (
          <p className="mt-1 text-xs font-semibold text-destructive-text">
            Acima da condição Farmarcas ({formatBrl(line.negotiatedCents ?? 0)}/mês) · economia
            possível de {formatBrl(savings)}/ano
          </p>
        )}
        {!line.uses && line.negotiatedCents !== null && (
          <p className="mt-1 text-xs font-semibold text-primary-hover">
            Disponível com condição Farmarcas
            {line.negotiatedCents
              ? ` a ${formatBrl(line.negotiatedCents)}/mês`
              : ' sem mensalidade'}
          </p>
        )}
        {error && <p className="mt-1 text-xs text-destructive-text">{error.message}</p>}
      </Cell>
      <Cell>
        {draft ? (
          <UsesToggle
            label={`${line.name} é usada?`}
            value={draft.uses}
            onChange={(uses) => setDraft({ ...draft, uses })}
          />
        ) : (
          <StatusBadge tone={usesTone(line.uses)}>{usesText(line.uses)}</StatusBadge>
        )}
      </Cell>
      <Cell isNumeric>
        {draft ? (
          <input
            aria-label={`Custo mensal de ${line.name} em reais`}
            inputMode="numeric"
            disabled={draft.uses !== true}
            value={draft.cost}
            onChange={(event) =>
              setDraft({ ...draft, cost: event.target.value.replace(/\D/g, '') })
            }
            placeholder="R$"
            className="h-8 w-24 rounded-md border border-border px-2 text-right text-sm focus:border-2 focus:border-primary focus:px-[7px] focus:outline-none disabled:bg-subtle"
          />
        ) : (
          <span className={line.uses ? 'font-semibold' : 'text-control'}>
            {line.uses ? formatBrl(line.costCents ?? 0) : '—'}
          </span>
        )}
      </Cell>
      <Cell isNumeric>
        {canEdit &&
          (draft ? (
            <span className="inline-flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button size="sm" disabled={draft.uses === null || isPending} onClick={save}>
                Salvar
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="link"
              onClick={() =>
                setDraft({
                  uses: line.uses,
                  cost: line.costCents ? String(Math.round(line.costCents / 100)) : '',
                })
              }
            >
              {line.uses === null ? 'Informar' : 'Editar'}
            </Button>
          ))}
      </Cell>
    </Row>
  );
}

function AddToolForm({ actions }: { actions: ReturnType<typeof useStorePage> }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [cost, setCost] = useState('');
  const { run, isPending, error } = useMutation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await run(() =>
      actions.addCustomEntry({
        kind: 'EXTERNAL_TOOL',
        name: name.trim(),
        ...(category.trim() ? { category: category.trim() } : {}),
        monthlyCostCents: parseBrlToCents(cost) ?? 0,
      }),
    );
    if (ok) {
      setName('');
      setCategory('');
      setCost('');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mx-5 flex flex-wrap items-end gap-2 rounded-md bg-subtle p-3"
    >
      <p className="basis-full text-xs font-semibold text-secondary-foreground">Outra ferramenta</p>
      <input
        aria-label="Nome da ferramenta"
        placeholder="Nome"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-9 min-w-48 flex-1 rounded-md border border-border bg-surface px-3 text-sm"
      />
      <input
        aria-label="Para que serve"
        placeholder="Para que serve"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        className="h-9 min-w-40 flex-1 rounded-md border border-border bg-surface px-3 text-sm"
      />
      <input
        aria-label="Custo mensal em reais"
        placeholder="Custo mensal (R$)"
        inputMode="numeric"
        value={cost}
        onChange={(event) => setCost(event.target.value.replace(/\D/g, ''))}
        className="h-9 w-36 rounded-md border border-border bg-surface px-3 text-sm"
      />
      <Button type="submit" size="sm" disabled={name.trim().length < 2 || isPending}>
        Adicionar
      </Button>
      {error && (
        <div className="basis-full">
          <InlineAlert>{error.message}</InlineAlert>
        </div>
      )}
    </form>
  );
}
