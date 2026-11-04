import { Card } from '@/components/ui/Card';
import { Cell, HeaderCell, Row, Table } from '@/components/ui/Table';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { Uf } from '@/lib/uf';
import { BRAZIL_GEOMETRY } from '../lib/brazil-geometry';
import {
  formatDecimal,
  METRICS,
  ownerShare,
  percentOf,
  ranking,
  REGIONS,
  regionOf,
  storesPerGroup,
  withoutPresence,
  type MetricKey,
} from '../lib/map-metrics';
import type { RegionKey, UfPresence } from '../types';

type StatesTableProps = {
  ufs: UfPresence[];
  networkStores: number;
  metric: MetricKey;
  region: RegionKey | null;
  uf: Uf | null;
  onSelectUf: (uf: Uf) => void;
};

// Tabela "Estados": os mesmos números do mapa, ordenados pela medida escolhida.
// É também o caminho pelo teclado para escolher um estado.
export function StatesTable({
  ufs,
  networkStores,
  metric,
  region,
  uf,
  onSelectUf,
}: StatesTableProps) {
  const rows = ranking(ufs, metric, region);
  const missing = withoutPresence(ufs, region);
  const top = rows[0]?.value || 1;
  const { label, format } = METRICS[metric];

  return (
    <Card as="section" className="overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-2.5 border-b border-border px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">Estados</h2>
        <p className="text-xs text-muted-foreground">
          {region ? REGIONS[region].name : 'Brasil'} · {rows.length} com presença · ordenado por{' '}
          {label.toLowerCase()} · clique para detalhar
        </p>
      </div>
      <Table label="Presença da rede por estado" minWidth="900px">
        <thead>
          <tr>
            <HeaderCell className="w-16">UF</HeaderCell>
            <HeaderCell>Estado</HeaderCell>
            <HeaderCell>Região</HeaderCell>
            <HeaderCell isNumeric>Lojas</HeaderCell>
            <HeaderCell isNumeric>% rede</HeaderCell>
            <HeaderCell isNumeric>Grupos</HeaderCell>
            <HeaderCell isNumeric>Lojas/grupo</HeaderCell>
            <HeaderCell isNumeric>Com proprietário</HeaderCell>
            <HeaderCell className="w-[22%]">{label}</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ presence, value }) => {
            const isSelected = presence.uf === uf;
            return (
              <Row
                key={presence.uf}
                onOpen={() => onSelectUf(presence.uf)}
                openLabel={`Detalhar ${BRAZIL_GEOMETRY[presence.uf].name}`}
              >
                <Cell
                  className={cn(
                    'py-2.5',
                    isSelected && 'bg-primary-tint shadow-[inset_3px_0_0_0_var(--color-primary)]',
                  )}
                >
                  <span className="block rounded-sm bg-subtle py-0.5 text-center text-[11px] font-bold text-secondary-foreground">
                    {presence.uf}
                  </span>
                </Cell>
                <Cell className={cn('py-2.5 font-semibold', isSelected && 'bg-primary-tint')}>
                  {BRAZIL_GEOMETRY[presence.uf].name}
                </Cell>
                <Cell
                  className={cn(
                    'py-2.5 text-secondary-foreground',
                    isSelected && 'bg-primary-tint',
                  )}
                >
                  {REGIONS[regionOf(presence.uf)].name}
                </Cell>
                <Cell isNumeric className={cn('py-2.5 font-bold', isSelected && 'bg-primary-tint')}>
                  {formatNumber(presence.stores)}
                </Cell>
                <Cell
                  isNumeric
                  className={cn(
                    'py-2.5 text-secondary-foreground',
                    isSelected && 'bg-primary-tint',
                  )}
                >
                  {formatDecimal(percentOf(presence.stores, networkStores))}%
                </Cell>
                <Cell isNumeric className={cn('py-2.5', isSelected && 'bg-primary-tint')}>
                  {formatNumber(presence.groups)}
                </Cell>
                <Cell isNumeric className={cn('py-2.5', isSelected && 'bg-primary-tint')}>
                  {formatDecimal(storesPerGroup(presence))}
                </Cell>
                <Cell isNumeric className={cn('py-2.5', isSelected && 'bg-primary-tint')}>
                  {formatNumber(presence.groupsWithOwner)} ({Math.round(ownerShare(presence))}%)
                </Cell>
                <Cell className={cn('py-2.5', isSelected && 'bg-primary-tint')}>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                      <span
                        className="block h-full bg-primary"
                        style={{ width: `${Math.max(3, percentOf(value, top))}%` }}
                      />
                    </span>
                    <span className="min-w-10 text-right text-xs font-semibold">
                      {format(value)}
                    </span>
                  </span>
                </Cell>
              </Row>
            );
          })}
        </tbody>
      </Table>
      {missing.length > 0 && (
        <p className="bg-background px-5 py-2.5 text-xs text-muted-foreground">
          Sem presença: {missing.join(', ')}
        </p>
      )}
    </Card>
  );
}
