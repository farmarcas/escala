import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useMutation } from '@/hooks/useMutation';
import { fieldErrors } from '@/lib/api';
import { formatPhone, onlyDigits } from '@/lib/format';
import type { GroupDetail, OwnerTransferInput } from '../types';

type OwnerTransferModalProps = {
  group: GroupDetail;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (input: OwnerTransferInput) => Promise<void>;
};

// Transferir a titularidade (spec 003, US5): a nova pessoa ganha código novo; a auditoria
// guarda só os códigos das duas, nunca nome ou contato.
export function OwnerTransferModal(props: OwnerTransferModalProps) {
  if (!props.isOpen) return null;
  return <TransferDialog {...props} />;
}

function TransferDialog({ group, onClose, onConfirm }: OwnerTransferModalProps) {
  const [values, setValues] = useState({ name: '', email: '', phone: '', justification: '' });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const { run, isPending, error } = useMutation();
  const errors = { ...fieldErrors(error), ...localErrors };

  const setField = (field: keyof typeof values, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: field === 'phone' ? formatPhone(value) : value,
    }));
    setLocalErrors({});
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const issues: Record<string, string> = {};
    const phone = onlyDigits(values.phone);
    if (values.name.trim().length < 3) issues.name = 'Informe o nome completo';
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) issues.email = 'E-mail inválido';
    if (phone.length < 10 || phone.length > 11) issues.phone = 'Informe DDD e número';
    if (values.justification.trim().length < 5) issues.justification = 'Explique o motivo';
    setLocalErrors(issues);
    if (Object.keys(issues).length > 0) return;
    const ok = await run(() =>
      onConfirm({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone,
        justification: values.justification.trim(),
      }),
    );
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      size="lg"
      title="Transferir titularidade"
      subtitle={`${group.name} · proprietário atual ${group.owner?.pseudonym ?? ''}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="owner-transfer-form" disabled={isPending}>
            Transferir
          </Button>
        </>
      }
    >
      <form
        id="owner-transfer-form"
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-secondary-foreground">
          O proprietário atual deixa de ser o primeiro administrador do grupo. A nova pessoa recebe
          um código novo. Na auditoria ficam só os códigos das duas pessoas e a justificativa.
        </p>
        {error && Object.keys(fieldErrors(error)).length === 0 && (
          <InlineAlert>{error.message}</InlineAlert>
        )}
        <TextField
          label="Nome do novo proprietário"
          isRequired
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          errorMessage={errors.name}
        />
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <TextField
            label="E-mail"
            isRequired
            type="email"
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
            errorMessage={errors.email}
          />
          <TextField
            label="Telefone"
            isRequired
            inputMode="tel"
            value={values.phone}
            onChange={(event) => setField('phone', event.target.value)}
            errorMessage={errors.phone}
            placeholder="(11) 90000-0000"
          />
        </div>
        <TextArea
          label="Justificativa"
          isRequired
          rows={3}
          value={values.justification}
          onChange={(event) => setField('justification', event.target.value)}
          errorMessage={errors.justification}
          placeholder="Por que a titularidade está mudando (mínimo de 5 caracteres)."
        />
      </form>
    </Modal>
  );
}
