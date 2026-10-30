import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { useMutation } from '@/hooks/useMutation';
import type { StatusAction } from '../types';

const COPY: Record<
  StatusAction,
  { title: string; text: string; button: string; isDanger: boolean }
> = {
  suspend: {
    title: 'Suspender tenant',
    text: 'O acesso de todos os funcionários do grupo fica bloqueado. Nenhum dado é apagado e a suspensão pode ser revertida.',
    button: 'Suspender',
    isDanger: true,
  },
  archive: {
    title: 'Arquivar tenant',
    text: 'O grupo sai das visões operacionais, o acesso é encerrado e ele não recebe lojas novas. Os dados são preservados e o grupo pode ser restaurado.',
    button: 'Arquivar',
    isDanger: true,
  },
  restore: {
    title: 'Restaurar tenant',
    text: 'O grupo volta a ficar ativo, com as lojas e o cadastro que tinha antes.',
    button: 'Restaurar',
    isDanger: false,
  },
};

type StatusChangeModalProps = {
  action: StatusAction | null;
  groupName: string;
  onClose: () => void;
  onConfirm: (action: StatusAction, justification: string) => Promise<void>;
};

export function StatusChangeModal({
  action,
  groupName,
  onClose,
  onConfirm,
}: StatusChangeModalProps) {
  const [justification, setJustification] = useState('');
  const { run, isPending, error, reset } = useMutation();
  const copy = action ? COPY[action] : null;
  const canConfirm = justification.trim().length > 0 && !isPending;

  const handleClose = () => {
    setJustification('');
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!action) return;
    if (await run(() => onConfirm(action, justification.trim()))) handleClose();
  };

  return (
    <Modal
      isOpen={copy !== null}
      title={copy?.title ?? ''}
      subtitle={groupName}
      onClose={handleClose}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant={copy?.isDanger ? 'danger' : 'primary'}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {copy?.button}
          </Button>
        </>
      }
    >
      <p className="text-sm text-secondary-foreground">{copy?.text}</p>
      <TextArea
        label="Justificativa"
        isRequired
        value={justification}
        onChange={(event) => setJustification(event.target.value)}
        placeholder="Explique o motivo. O texto fica na auditoria do grupo."
        maxLength={1000}
      />
      {error && <InlineAlert>{error.message}</InlineAlert>}
    </Modal>
  );
}
