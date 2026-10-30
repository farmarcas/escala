import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { formatNumber } from '@/lib/format';
import type { BrandStats } from '../types';

type BrandsKpisProps = { stats: BrandStats | undefined };

export function BrandsKpis({ stats }: BrandsKpisProps) {
  const isLoading = !stats;
  return (
    <KpiGrid>
      <KpiCard
        label="Marcas ativas"
        value={formatNumber(stats?.active ?? 0)}
        context="Disponíveis no cadastro de loja"
        isLoading={isLoading}
      />
      <KpiCard
        label="Marcas históricas"
        value={formatNumber(stats?.historical ?? 0)}
        context="Preservadas nas lojas que já as usam"
        isLoading={isLoading}
      />
      <KpiCard
        label="Marcas sem loja"
        value={formatNumber(stats?.withoutStores ?? 0)}
        context="Ativas e sem nenhuma loja vinculada"
        isLoading={isLoading}
      />
    </KpiGrid>
  );
}
