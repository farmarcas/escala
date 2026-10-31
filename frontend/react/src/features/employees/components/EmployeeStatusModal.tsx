import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { useMutation } from '@/hooks/useMutation';
import type { EmployeeDetail, EmployeeStatusAction } from '../types';

const COPY: Record<EmployeeStatusAction, { title: string; text: string; button: string }> = {
  terminate: {
    title: 'Desligar funcionário',
    text: 'A pessoa deixa de aparecer nas listas de escolha (como a de Anjo). O cadastro e o histórico continuam, e ela pode ser religada.',
    button: 'Desligar',
  },
  rehire: {
    title: 'Religar funcionário',
    text: 'A pessoa volta a aparecer nas listas de escolha, com os mesmos dados.',
    button: 'Religar',
  },
};

type EmployeeStatusModalProps = {
  employee: EmployeeDetail;
  action: EmployeeStatusAction | null;
  onClose: () => void;
  onConfirm: (action: EmployeeStatusAction, justification: string) => Promise<void>;
};

export function EmployeeStatusModal({
  employee,
  action,
  onClose,
  onConfirm,
}: EmployeeStatusModalProps) {
  if (!action) return null;
  return (
    <StatusDialog employee={employee} action={action} onClose={onClose} onConfirm={onConfirm} />
  );
}

function StatusDialog({
  employee,
  action,
  onClose,
  onConfirm,
}: EmployeeStatusModalProps & { action: EmployeeStatusAction }) {
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
      subtitle={employee.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="employee-status-form"
            variant={action === 'terminate' ? 'danger' : 'primary'}
            disabled={!isReady || isPending}
          >
            {copy.button}
          </Button>
        </>
      }
    >
      <form id="employee-status-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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
