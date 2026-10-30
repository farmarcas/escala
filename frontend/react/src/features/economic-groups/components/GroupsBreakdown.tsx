import type { ReactNode } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { formatNumber, pluralize } from '@/lib/format';
import { ufName } from '@/lib/uf';
import type { GroupSize, GroupStats } from '../types';

type GroupsBreakdownProps = { stats: GroupStats | undefined };

const SIZE_LABEL: Record<GroupSize, string> = {
  none: 'Sem loja',
  one: '1 loja',
  small: '2 a 5 lojas',
  medium: '6 a 20 lojas',
  large: 'Acima de 20 lojas',
};

const TOP_UFS = 5;

// Painéis do cadastro: grupos por porte e concentração por estado.
export function GroupsBreakdown({ stats }: GroupsBreakdownProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card as="section" className="p-5">
        <CardTitle
          title="Grupos por porte"
          description="Faixa de lojas · GEs com proprietário cadastrado"
        />
        {stats ? <SizeBars bySize={stats.bySize} /> : <LoadingState label="Carregando" />}
      </Card>
      <Card as="section" className="p-5">
        <CardTitle
          title="Concentração por estado"
          description={`Lojas e GEs por UF · ${pluralize(stats?.ufCount ?? 0, 'estado coberto', 'estados cobertos')}`}
        />
        {stats ? <UfBars byUf={stats.byUf} /> : <LoadingState label="Carregando" />}
      </Card>
    </div>
  );
}

function BarRow({
  label,
  detail,
  children,
}: {
  label: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <li>
      <p className="mb-1.5 flex justify-between gap-4 text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="whitespace-nowrap text-muted-foreground">{detail}</span>
      </p>
      <div aria-hidden="true" className="relative h-2 overflow-hidden rounded-full bg-subtle">
        {children}
      </div>
    </li>
  );
}

function SizeBars({ bySize }: { bySize: GroupStats['bySize'] }) {
  // "Sem loja" só aparece quando existe grupo nessa situação.
  const rows = bySize.filter((row) => row.size !== 'none' || row.groups > 0);
  return (
    <div className="mt-4">
      <ul className="flex flex-col gap-3.5">
        {rows.map((row) => (
          <BarRow
            key={row.size}
            label={SIZE_LABEL[row.size]}
            detail={`${pluralize(row.groups, 'GE', 'GEs')} · ${formatNumber(row.withOwner)} com proprietário`}
          >
            {row.groups > 0 && (
              <>
                <div className="absolute inset-0 bg-primary/25" />
                <div
                  className="absolute inset-y-0 left-0 bg-primary"
                  style={{ width: `${(row.withOwner / row.groups) * 100}%` }}
                />
              </>
            )}
          </BarRow>
        ))}
      </ul>
      <p className="mt-3.5 flex flex-wrap gap-4 border-t border-subtle pt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-primary" />
          Com proprietário
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-primary/25" />
          Sem proprietário
        </span>
      </p>
    </div>
  );
}

function UfBars({ byUf }: { byUf: GroupStats['byUf'] }) {
  if (byUf.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">Nenhuma loja cadastrada.</p>;
  }
  const top = byUf.slice(0, TOP_UFS);
  const rest = byUf.slice(TOP_UFS);
  const max = top[0]?.stores ?? 1;
  return (
    <div className="mt-4">
      <ul className="flex flex-col gap-3.5">
        {top.map((row, index) => (
          <BarRow
            key={row.uf}
            label={ufName(row.uf)}
            detail={`${pluralize(row.stores, 'loja', 'lojas')} · ${pluralize(row.groups, 'GE', 'GEs')}`}
          >
            <div
              className={cn(
                'h-full rounded-full',
                index === 0
                  ? 'bg-foreground'
                  : index < 3
                    ? 'bg-secondary-foreground'
                    : 'bg-control',
              )}
              style={{ width: `${(row.stores / max) * 100}%` }}
            />
          </BarRow>
        ))}
      </ul>
      {rest.length > 0 && (
        <p className="mt-3.5 border-t border-subtle pt-2 text-xs text-muted-foreground">
          Outros {pluralize(rest.length, 'estado soma', 'estados somam')}{' '}
          {pluralize(
            rest.reduce((sum, row) => sum + row.stores, 0),
            'loja',
            'lojas',
          )}
          .
        </p>
      )}
    </div>
  );
}
