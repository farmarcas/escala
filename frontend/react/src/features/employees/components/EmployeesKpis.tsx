import { useNavigate } from 'react-router-dom';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { formatNumber, pluralize } from '@/lib/format';
import type { EmployeeStats } from '../types';

type EmployeesKpisProps = { stats: EmployeeStats | undefined };

export function EmployeesKpis({ stats }: EmployeesKpisProps) {
  const navigate = useNavigate();
  const isLoading = !stats;
  return (
    <KpiGrid className="sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Funcionários ativos"
        value={formatNumber(stats?.active ?? 0)}
        context="Pessoas da Farmarcas cadastradas no Backoffice"
        isLoading={isLoading}
      />
      <KpiCard
        label="Anjos"
        value={formatNumber(stats?.angels ?? 0)}
        context={`Acompanham ${pluralize(stats?.angelGroups ?? 0, 'grupo', 'grupos')} em operação`}
        isLoading={isLoading}
      />
      <KpiCard
        label="Grupos sem Anjo"
        value={formatNumber(stats?.groupsWithoutAngel ?? 0)}
        context="Grupos em operação ainda sem ninguém da Farmarcas · clique para ver"
        isWarning={(stats?.groupsWithoutAngel ?? 0) > 0}
        onClick={() => navigate('/grupos?semAnjo=1')}
        isLoading={isLoading}
      />
      <KpiCard
        label="Administradores do Backoffice"
        value={formatNumber(stats?.admins ?? 0)}
        context="Cadastram funcionários, dão acessos e mexem em Configurações"
        isLoading={isLoading}
      />
    </KpiGrid>
  );
}
