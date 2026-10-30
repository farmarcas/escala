import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { useMutation } from '@/hooks/useMutation';
import { formatStoreCode } from '@/lib/format';
import { STORE_STATUS } from '../storeLabels';
import type { Store } from '../types';

type StoreStatus = 'ACTIVE' | 'INACTIVE';

type StoreStatusCellProps = {
  store: Store;
  canEdit: boolean;
  onSetStatus?: (id: string, status: StoreStatus, justification: string) => Promise<void>;
};

const MIN_REASON = 5;

// Status da loja; ativar ou inativar pede confirmação com justificativa (vai para a auditoria).
export function StoreStatusCell({ store, canEdit, onSetStatus }: StoreStatusCellProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const status = STORE_STATUS[store.status];
  const next: StoreStatus = store.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const actionLabel = next === 'ACTIVE' ? 'Ativar' : 'Inativar';

  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge tone={status.tone} title={status.title}>
        {status.label}
      </StatusBadge>
      {canEdit && onSetStatus && (
        <Button
          variant="link"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            setIsConfirming(true);
          }}
          className="text-xs"
        >
          {actionLabel}
        </Button>
      )}
      {isConfirming &&
        onSetStatus &&
        // Fora da linha (que é clicável e pode estar esmaecida): cliques e Enter não abrem a loja.
        createPortal(
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.stopPropagation();
            }}
          >
            <StatusConfirmModal
              store={store}
              next={next}
              onClose={() => setIsConfirming(false)}
              onConfirm={(justification) => onSetStatus(store.id, next, justification)}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

type StatusConfirmModalProps = {
  store: Store;
  next: StoreStatus;
  onClose: () => void;
  onConfirm: (justification: string) => Promise<void>;
};

function StatusConfirmModal({ store, next, onClose, onConfirm }: StatusConfirmModalProps) {
  const [justification, setJustification] = useState('');
  const { run, isPending, error } = useMutation();
  const isActivating = next === 'ACTIVE';
  const canConfirm = justification.trim().length >= MIN_REASON && !isPending;

  const handleConfirm = async () => {
    if (await run(() => onConfirm(justification.trim()))) onClose();
  };

  return (
    <Modal
      isOpen
      title={isActivating ? 'Ativar loja' : 'Inativar loja'}
      subtitle={`${formatStoreCode(store.code)} · ${store.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={isActivating ? 'primary' : 'danger'}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {isActivating ? 'Ativar' : 'Inativar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {isActivating
            ? store.status === 'PENDING'
              ? 'A loja está pendente no grupo. Ative só depois de confirmar com o grupo que ela está em operação.'
              : 'A loja volta a operar e a contar nos indicadores da rede.'
            : 'A loja deixa de operar. O cadastro e o histórico são preservados e ela pode ser reativada.'}
        </p>
        <TextArea
          label="Justificativa"
          isRequired
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          placeholder="Explique o motivo. O texto fica na auditoria do grupo."
          maxLength={500}
        />
        {error && <InlineAlert>{error.message}</InlineAlert>}
      </div>
    </Modal>
  );
}
