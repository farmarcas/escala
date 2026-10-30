import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { formatNumber, pluralize } from '@/lib/format';
import type { GroupStats } from '../types';

type GroupsKpisProps = { stats: GroupStats | undefined };

const EMPTY: GroupStats = {
  byStatus: { all: 0, active: 0, suspended: 0, archived: 0 },
  stores: { total: 0, pdv: 0, cd: 0 },
  ufCount: 0,
  withOwner: 0,
  multiBrand: 0,
  groupsWithCd: 0,
  outdated: 0,
  bySize: [],
  byUf: [],
};

// "SP, MG e PR"
const joinList = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;

export function GroupsKpis({ stats }: GroupsKpisProps) {
  const isLoading = !stats;
  const s = stats ?? EMPTY;
  const withoutOwner = s.byStatus.all - s.withOwner;
  const pdvPerGroup = s.byStatus.all ? Math.round((s.stores.pdv / s.byStatus.all) * 10) / 10 : 0;
  const topUfs = s.byUf.slice(0, 3).map((item) => item.uf);

  return (
    // Seis indicadores: 3 × 2 em telas médias, todos lado a lado nas largas.
    <KpiGrid className="sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <KpiCard
        label="GEs cadastrados"
        value={formatNumber(s.byStatus.all)}
        context={`${pluralize(s.byStatus.active, 'ativo', 'ativos')} · ${pluralize(s.byStatus.suspended, 'suspenso', 'suspensos')} · ${pluralize(s.byStatus.archived, 'arquivado', 'arquivados')}`}
        isLoading={isLoading}
      />
      <KpiCard
        label="Lojas na rede"
        value={formatNumber(s.stores.total)}
        context={
          <>
            <span className="mb-2 mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-subtle px-2.5 py-0.5 font-semibold text-secondary-foreground">
                PDV · {formatNumber(s.stores.pdv)}
              </span>
              <span className="rounded-full bg-info-soft px-2.5 py-0.5 font-semibold text-info-text">
                CD · {formatNumber(s.stores.cd)}
              </span>
            </span>
            Média de {formatNumber(pdvPerGroup)} PDV por GE ·{' '}
            {pluralize(s.groupsWithCd, 'GE com CD', 'GEs com CD')}
          </>
        }
        isLoading={isLoading}
      />
      <KpiCard
        label="Estados cobertos"
        value={formatNumber(s.ufCount)}
        context={
          topUfs.length > 0 ? `Concentração em ${joinList(topUfs)}` : 'Nenhuma loja cadastrada'
        }
        isLoading={isLoading}
      />
      <KpiCard
        label="Com proprietário"
        value={formatNumber(s.withOwner)}
        suffix={`de ${formatNumber(s.byStatus.all)}`}
        progress={{
          percent: s.byStatus.all ? (s.withOwner / s.byStatus.all) * 100 : 0,
          tone: 'primary',
        }}
        context={`${formatNumber(withoutOwner)} sem proprietário · ativação do acesso chega com o login`}
        isLoading={isLoading}
      />
      <KpiCard
        label="GEs multimarca"
        value={formatNumber(s.multiBrand)}
        context="Com lojas de 2 ou mais marcas"
        isLoading={isLoading}
      />
      <KpiCard
        label="Cadastro desatualizado"
        value={formatNumber(s.outdated)}
        context="Sem revisão de lojas há mais de 180 dias"
        isWarning
        isLoading={isLoading}
      />
    </KpiGrid>
  );
}
