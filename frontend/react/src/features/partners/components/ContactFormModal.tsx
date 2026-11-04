import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useMutation } from '@/hooks/useMutation';
import { fieldErrors } from '@/lib/api';
import { formatPhone, onlyDigits } from '@/lib/format';
import type { Contact, ContactInput } from '../types';

type ContactFormModalProps = {
  isOpen: boolean;
  contact?: Contact;
  partnerName: string;
  onClose: () => void;
  onSave: (input: ContactInput) => Promise<void>;
};

// Montado só quando aberto: o formulário sempre começa com os dados atuais.
export function ContactFormModal(props: ContactFormModalProps) {
  if (!props.isOpen) return null;
  return <ContactFormDialog {...props} />;
}

function ContactFormDialog({ contact, partnerName, onClose, onSave }: ContactFormModalProps) {
  const [values, setValues] = useState({
    name: contact?.name ?? '',
    jobTitle: contact?.jobTitle ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ? formatPhone(contact.phone) : '',
  });
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
    if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      issues.email = 'E-mail inválido';
    }
    if (phone && (phone.length < 10 || phone.length > 11)) issues.phone = 'Informe DDD e número';
    if (!values.email.trim() && !phone) issues.email = 'Informe e-mail ou telefone';
    setLocalErrors(issues);
    if (Object.keys(issues).length > 0) return;

    const ok = await run(() =>
      onSave({
        name: values.name.trim(),
        jobTitle: values.jobTitle.trim() || null,
        email: values.email.trim().toLowerCase() || null,
        phone: phone || null,
      }),
    );
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      title={contact ? 'Editar contato' : 'Novo contato'}
      subtitle={partnerName}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="contact-form" disabled={isPending}>
            {contact ? 'Salvar contato' : 'Incluir contato'}
          </Button>
        </>
      }
    >
      <form id="contact-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && Object.keys(fieldErrors(error)).length === 0 && (
          <InlineAlert>{error.message}</InlineAlert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nome"
            isRequired
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            errorMessage={errors.name}
          />
          <TextField
            label="Cargo"
            value={values.jobTitle}
            onChange={(event) => setField('jobTitle', event.target.value)}
            placeholder="Ex.: Gerente de contas"
          />
          <TextField
            label="E-mail"
            type="email"
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
            errorMessage={errors.email}
          />
          <TextField
            label="Telefone"
            inputMode="tel"
            value={values.phone}
            onChange={(event) => setField('phone', event.target.value)}
            errorMessage={errors.phone}
            placeholder="(11) 90000-0000"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Informe pelo menos e-mail ou telefone. É contato comercial da empresa: os dois papéis da
          plataforma veem.
        </p>
      </form>
    </Modal>
  );
}
