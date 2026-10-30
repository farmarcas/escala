import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { useGroupDetail } from '../hooks/useGroupDetail';
import type { GroupTabContext, StatusAction } from '../types';
import { GroupFormModal } from './GroupFormModal';
import { GroupHeader } from './GroupHeader';
import { GroupSummaryCards } from './GroupSummaryCards';
import { StatusChangeModal } from './StatusChangeModal';

type DetailTab = 'stores' | 'audit';

type GroupDetailViewProps = {
  number: number;
  canEdit: boolean;
  // Lojas e auditoria são de outras features: a página entrega cada aba pronta.
  renderStores: (context: GroupTabContext) => ReactNode;
  renderAudit: (context: GroupTabContext) => ReactNode;
};

export function GroupDetailView({
  number,
  canEdit,
  renderStores,
  renderAudit,
}: GroupDetailViewProps) {
  const { group, isLoading, error, reload, update, changeStatus } = useGroupDetail(number);
  const [tab, setTab] = useState<DetailTab>('stores');
  const [isEditing, setIsEditing] = useState(false);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [isAddingStore, setIsAddingStore] = useState(false);

  if (isLoading) return <LoadingState label="Carregando grupo" />;
  if (error?.code === 'GROUP_NOT_FOUND') {
    return (
      <EmptyState
        title="Grupo não encontrado"
        description={`Não existe grupo econômico com o número ${number}.`}
        action={
          <Link
            to="/grupos"
            className="text-sm font-semibold text-primary hover:text-primary-hover"
          >
            Ver todos os grupos
          </Link>
        }
      />
    );
  }
  if (error || !group)
    return <ErrorState message={error?.message ?? 'Erro ao carregar'} onRetry={reload} />;

  const context: GroupTabContext = {
    group,
    canEdit,
    onChanged: reload,
    isAddingStore,
    setIsAddingStore,
  };

  return (
    <>
      <GroupHeader
        group={group}
        canEdit={canEdit}
        onEdit={() => setIsEditing(true)}
        onStatusAction={setStatusAction}
        onAddStore={() => {
          setTab('stores');
          setIsAddingStore(true);
        }}
      />
      <GroupSummaryCards group={group} />

      <Card as="section" className="overflow-hidden">
        <div className="px-5">
          <Tabs<DetailTab>
            label="Seções do grupo"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'stores', label: 'Lojas' },
              { value: 'audit', label: 'Auditoria' },
            ]}
          />
        </div>
        {tab === 'stores' ? renderStores(context) : renderAudit(context)}
      </Card>

      <GroupFormModal
        isOpen={isEditing}
        group={group}
        onClose={() => setIsEditing(false)}
        onUpdate={update}
      />
      <StatusChangeModal
        action={statusAction}
        groupName={group.name}
        onClose={() => setStatusAction(null)}
        onConfirm={changeStatus}
      />
    </>
  );
}
