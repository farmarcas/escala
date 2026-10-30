import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { useBasicEditor } from '../hooks/useBasicEditor';
import { useCatalog } from '../hooks/useCatalog';
import { useChangeRequests } from '../hooks/useChangeRequests';
import { useStorePage } from '../hooks/useStorePage';
import type { RequestType, Side } from '../types';
import { ChannelsTab } from './ChannelsTab';
import { DataTab } from './DataTab';
import { DocumentsTab } from './DocumentsTab';
import { FurnitureTab } from './FurnitureTab';
import { GovernanceCard } from './GovernanceCard';
import { HistoryTab } from './HistoryTab';
import { RequestModal } from './RequestModal';
import { RequestsPanel } from './RequestsPanel';
import { ResponsiblesTab } from './ResponsiblesTab';
import { StoreHeader } from './StoreHeader';
import { StrategiesTab } from './StrategiesTab';
import { SystemsTab } from './SystemsTab';

type TabKey =
  | 'data'
  | 'strategies'
  | 'furniture'
  | 'responsibles'
  | 'systems'
  | 'channels'
  | 'documents'
  | 'history';

type StorePageViewProps = { side: Side; code: number; backTo: string; backLabel: string };

// Página da loja, igual para a Farmarcas e para o grupo; o que cada lado pode fazer vem da API.
export function StorePageView({ side, code, backTo, backLabel }: StorePageViewProps) {
  const store = useStorePage(side, code);
  const requests = useChangeRequests(side, code, store.reload);
  const editor = useBasicEditor(store.page);
  const catalog = useCatalog(side);
  const [tab, setTab] = useState<TabKey>('data');
  const [requestType, setRequestType] = useState<RequestType | null>(null);

  if (store.isLoading) return <LoadingState label="Carregando loja" />;
  if (store.error?.code === 'STORE_NOT_FOUND') {
    return (
      <EmptyState
        title="Loja não encontrada"
        description="A loja não existe ou não está disponível para você."
        action={
          <Link to={backTo} className="text-sm font-semibold text-primary hover:text-primary-hover">
            {backLabel}
          </Link>
        }
      />
    );
  }
  if (store.error || !store.page) {
    return (
      <ErrorState message={store.error?.message ?? 'Erro ao carregar'} onRetry={store.reload} />
    );
  }

  const page = store.page;
  const busyTypes = requests.requests.map((request) => request.type);
  const firstFreeType = (['CNPJ', 'ADDRESS', 'BRAND', 'TAX_REGIME'] as RequestType[]).find(
    (type) => !busyTypes.includes(type),
  );

  return (
    <>
      <StoreHeader
        page={page}
        backTo={backTo}
        backLabel={backLabel}
        isEditing={editor.isEditing}
        onEdit={() => {
          editor.start();
          setTab('data');
        }}
        onNewRequest={() => setRequestType(firstFreeType ?? 'CNPJ')}
      />
      <GovernanceCard
        page={page}
        isEditing={editor.isEditing}
        onValidate={() => store.validate(page.version)}
        onRemind={store.remind}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Sem overflow-hidden: a barra de edição precisa ficar presa no topo ao rolar. */}
        <Card as="section" className="min-w-0">
          <div className="overflow-x-auto px-5">
            <Tabs<TabKey>
              label="Seções da loja"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'data', label: 'Dados' },
                { value: 'strategies', label: 'Estratégias' },
                { value: 'furniture', label: 'Mobiliário' },
                { value: 'responsibles', label: 'Responsáveis' },
                { value: 'systems', label: 'Sistemas' },
                { value: 'channels', label: 'Canais' },
                {
                  value: 'documents',
                  label:
                    page.documentAlerts > 0 ? `Documentos (${page.documentAlerts})` : 'Documentos',
                },
                { value: 'history', label: 'Histórico' },
              ]}
            />
          </div>
          {tab === 'data' && (
            <DataTab
              page={page}
              editor={editor}
              catalog={catalog}
              openRequestTypes={busyTypes}
              onRequest={setRequestType}
              onSave={() => editor.save(store.save)}
            />
          )}
          {tab === 'strategies' && (
            <StrategiesTab page={page} catalog={catalog} onSave={store.setStrategies} />
          )}
          {tab === 'furniture' && (
            <FurnitureTab page={page} catalog={catalog} onSave={store.setFurniture} />
          )}
          {tab === 'history' && <HistoryTab side={side} code={code} />}
          {tab === 'systems' && <SystemsTab page={page} catalog={catalog} actions={store} />}
          {tab === 'channels' && <ChannelsTab page={page} catalog={catalog} actions={store} />}
          {tab === 'documents' && <DocumentsTab side={side} code={code} onChanged={store.reload} />}
          {tab === 'responsibles' && <ResponsiblesTab page={page} />}
        </Card>

        <RequestsPanel canAttach={!page.isReadOnly} requests={requests} />
      </div>

      <RequestModal
        page={page}
        initialType={requestType}
        busyTypes={busyTypes}
        onClose={() => setRequestType(null)}
        onCreate={requests.create}
      />
    </>
  );
}
