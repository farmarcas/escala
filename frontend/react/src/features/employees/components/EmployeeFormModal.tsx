import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { useMutation } from '@/hooks/useMutation';
import { useEmployeeOptions } from '../hooks/useEmployeeDetail';
import { useEmployeeForm } from '../hooks/useEmployeeForm';
import type { EmployeeInput } from '../types';
import { GeneralDataFields } from './GeneralDataFields';

type EmployeeFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: EmployeeInput) => Promise<void>;
};

// Novo funcionário: os mesmos campos da aba Dados gerais. O acesso aos sistemas é dado depois,
// na aba Sistemas e acesso (spec 005, FR-005). Montado só quando aberto.
export function EmployeeFormModal(props: EmployeeFormModalProps) {
  if (!props.isOpen) return null;
  return <EmployeeFormDialog {...props} />;
}

function EmployeeFormDialog({ onClose, onCreate }: EmployeeFormModalProps) {
  const form = useEmployeeForm(undefined);
  const { options } = useEmployeeOptions();
  const { run, isPending, error } = useMutation();
  const errors = form.errorsFrom(error);
  const emailTaken = error?.code === 'EMPLOYEE_EMAIL_TAKEN' ? error.message : undefined;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.validate()) return;
    if (await run(() => onCreate(form.toInput()))) onClose();
  };

  return (
    <Modal
      isOpen
      size="lg"
      title="Novo funcionário"
      subtitle="Colaborador Farmarcas · o acesso aos sistemas é dado no perfil"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-new-form" disabled={isPending}>
            Cadastrar funcionário
          </Button>
        </>
      }
    >
      <form
        id="employee-new-form"
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        {error && !emailTaken && Object.keys(errors).length === 0 && (
          <InlineAlert>{error.message}</InlineAlert>
        )}
        <GeneralDataFields form={form} options={options} errors={errors} emailTaken={emailTaken} />
      </form>
    </Modal>
  );
}
