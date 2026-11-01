import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InlineAlert } from '@/components/ui/States';
import { useMutation } from '@/hooks/useMutation';
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
  fieldLabel: string;
  uses: boolean | null;
  identifier: string | null;
};

const GROUPS = [
  { key: 'prop', title: 'Canais proprietários', description: 'Canais próprios da loja ou da rede' },
  { key: 'terc', title: 'Canais terceiros', description: 'Plataformas e redes de parceiros' },
] as const;

type ChannelsTabProps = {
  page: StorePage;
  catalog: Catalog;
  actions: ReturnType<typeof useStorePage>;
};

// Canais de venda e relacionamento, declarados pelo grupo (US9).
export function ChannelsTab({ page, catalog, actions }: ChannelsTabProps) {
  const canEdit = page.permissions.canEditChannels;
  const linesOf = (group: string): Line[] => [
    ...catalog
      .byKind(
        'CHANNEL',
        page.channels.filter((channel) => channel.uses).map((channel) => channel.itemId),
      )
      .filter((item) => item.groupLabel === group)
      .map((item) => {
        const answer = page.channels.find((channel) => channel.itemId === item.id);
        return {
          key: item.id,
          itemId: item.id,
          name: item.name,
          isInactive: !item.active,
          fieldLabel: item.description ?? 'Identificação',
          uses: answer ? answer.uses : null,
          identifier: answer?.identifier ?? null,
        };
      }),
    ...(group === 'terc'
      ? page.customEntries
          .filter((entry) => entry.kind === 'CHANNEL')
          .map((entry) => ({
            key: entry.id,
            customId: entry.id,
            name: entry.name,
            fieldLabel: 'Identificação',
            uses: true,
            identifier: entry.identifier,
          }))
      : []),
  ];
  const all = GROUPS.flatMap((group) => linesOf(group.key));
  const proprietary = linesOf('prop');
  const inUse = all.filter((line) => line.uses).length;
  const proprietaryInUse = proprietary.filter((line) => line.uses).length;
  const unanswered = all.filter((line) => line.uses === null).length;

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <div>
        <h2 className="text-base font-semibold">Canais</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {page.side === 'platform'
            ? 'Preenchido pelo grupo · a Farmarcas acompanha · cada mudança entra no histórico'
            : 'Informe se a loja usa cada canal e como encontrá-la nele · cada mudança entra no histórico'}
        </p>
        <KpiGrid>
          <KpiCard
            label="Canais em uso"
            value={`${inUse} de ${all.length}`}
            context="Proprietários e terceiros"
          />
          <KpiCard
            label="Proprietários"
            value={`${proprietaryInUse} de ${proprietary.length}`}
            context="Aplicativo e webcommerce"
          />
          <KpiCard
            label="Terceiros"
            value={String(inUse - proprietaryInUse)}
            context="Marketplaces, delivery e redes"
          />
          <KpiCard
            label="Não informados"
            value={String(unanswered)}
            context={unanswered ? 'Faltam respostas do grupo' : 'Todos os canais respondidos'}
          />
        </KpiGrid>
      </div>
      {GROUPS.map((group) => {
        const lines = linesOf(group.key);
        return (
          <section key={group.key} className="rounded-md border border-border">
            <div className="flex flex-wrap items-baseline gap-2 border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <span className="text-xs text-muted-foreground">{group.description}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {lines.filter((line) => line.uses).length} de {lines.length} em uso
              </span>
            </div>
            <ul>
              {lines.map((line) => (
                <ChannelRow key={line.key} line={line} canEdit={canEdit} actions={actions} />
              ))}
            </ul>
            {group.key === 'terc' && canEdit && <AddChannelForm actions={actions} />}
          </section>
        );
      })}
    </div>
  );
}

function ChannelRow({
  line,
  canEdit,
  actions,
}: {
  line: Line;
  canEdit: boolean;
  actions: ReturnType<typeof useStorePage>;
}) {
  const [draft, setDraft] = useState<{ uses: boolean | null; identifier: string } | null>(null);
  const { run, isPending, error } = useMutation();
  const issue = draft && draft.uses === null ? 'Escolha Sim ou Não' : null;

  const save = async () => {
    if (!draft || draft.uses === null) return;
    const identifier = draft.identifier.trim() || null;
    const ok = await run(() =>
      line.customId
        ? draft.uses
          ? actions.updateCustomEntry(line.customId!, { identifier })
          : actions.removeCustomEntry(line.customId!)
        : actions.setChannel(line.itemId!, draft.uses!, identifier),
    );
    if (ok) setDraft(null);
  };

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-subtle px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-semibold">
          {line.name}
          {line.isInactive && (
            <span className="ml-2">
              <InactiveTag />
            </span>
          )}
          {line.customId && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Incluído pelo grupo
            </span>
          )}
        </p>
        {!draft && (
          <p
            className={
              line.uses === null ? 'text-xs text-warning-text' : 'text-xs text-muted-foreground'
            }
          >
            {line.uses === null
              ? 'Ainda não informado pelo grupo'
              : line.uses
                ? line.identifier || 'Sem identificação'
                : 'Não utiliza'}
          </p>
        )}
      </div>
      {draft ? (
        <div className="flex flex-wrap items-center gap-2">
          <UsesToggle
            label={`A loja usa ${line.name}?`}
            value={draft.uses}
            onChange={(uses) => setDraft({ ...draft, uses })}
          />
          <input
            aria-label={line.fieldLabel}
            placeholder={line.fieldLabel}
            disabled={draft.uses !== true}
            value={draft.identifier}
            onChange={(event) => setDraft({ ...draft, identifier: event.target.value })}
            className="h-8 w-56 rounded-md border border-border px-2 text-sm focus:border-2 focus:border-primary focus:px-[7px] focus:outline-none disabled:bg-subtle"
          />
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            Cancelar
          </Button>
          <Button size="sm" disabled={Boolean(issue) || isPending} onClick={save}>
            Salvar
          </Button>
          {(issue || error) && (
            <span className="basis-full text-xs text-destructive-text">
              {issue ?? error?.message}
            </span>
          )}
        </div>
      ) : (
        <>
          <StatusBadge tone={usesTone(line.uses)}>{usesText(line.uses)}</StatusBadge>
          {canEdit && (
            <Button
              size="sm"
              variant="link"
              onClick={() => setDraft({ uses: line.uses, identifier: line.identifier ?? '' })}
            >
              {line.uses === null ? 'Informar' : 'Editar'}
            </Button>
          )}
        </>
      )}
    </li>
  );
}

function AddChannelForm({ actions }: { actions: ReturnType<typeof useStorePage> }) {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const { run, isPending, error } = useMutation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await run(() =>
      actions.addCustomEntry({
        kind: 'CHANNEL',
        name: name.trim(),
        ...(identifier.trim() ? { identifier: identifier.trim() } : {}),
      }),
    );
    if (ok) {
      setName('');
      setIdentifier('');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-2 border-t border-border bg-background px-4 py-3"
    >
      <p className="basis-full text-xs font-semibold text-secondary-foreground">Outro canal</p>
      <input
        aria-label="Nome do canal"
        placeholder="Nome do canal"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-9 min-w-48 flex-1 rounded-md border border-border bg-surface px-3 text-sm"
      />
      <input
        aria-label="Identificação"
        placeholder="Nome da loja ou link"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        className="h-9 min-w-48 flex-1 rounded-md border border-border bg-surface px-3 text-sm"
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
