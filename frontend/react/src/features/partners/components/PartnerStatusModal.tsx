import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { useMutation } from '@/hooks/useMutation';
import type { PartnerDetail, PartnerStatusAction } from '../types';

const COPY: Record<PartnerStatusAction, { title: string; text: string; button: string }> = {
  inactivate: {
    title: 'Inativar parceiro',
    text: 'O parceiro continua consultável, com contatos e histórico, e pode ser reativado. Parceiro não é excluído.',
    button: 'Inativar',
  },
  reactivate: {
    title: 'Reativar parceiro',
    text: 'O parceiro volta a aparecer como ativo, com os mesmos dados e contatos.',
    button: 'Reativar',
  },
};

type PartnerStatusModalProps = {
  partner: PartnerDetail;
  action: PartnerStatusAction | null;
  onClose: () => void;
  onConfirm: (action: PartnerStatusAction, justification: string) => Promise<void>;
};

export function PartnerStatusModal(props: PartnerStatusModalProps) {
  if (!props.action) return null;
  return <StatusDialog {...props} action={props.action} />;
}

function StatusDialog({
  partner,
  action,
  onClose,
  onConfirm,
}: PartnerStatusModalProps & { action: PartnerStatusAction }) {
  const [justification, setJustification] = useState('');
  const { run, isPending, error } = useMutation();
  const copy = COPY[action];
  const isReady = justification.trim().length >= 5;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isReady) return;
    const ok = await run(() => onConfirm(action, justification.trim()));
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      title={copy.title}
      subtitle={partner.tradeName}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="partner-status-form"
            variant={action === 'inactivate' ? 'danger' : 'primary'}
            disabled={!isReady || isPending}
          >
            {copy.button}
          </Button>
        </>
      }
    >
      <form id="partner-status-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">{copy.text}</p>
        {error && <InlineAlert>{error.message}</InlineAlert>}
        <TextArea
          label="Motivo"
          isRequired
          rows={3}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          placeholder="Explique o motivo (mínimo de 5 caracteres). Fica no histórico."
        />
      </form>
    </Modal>
  );
}
