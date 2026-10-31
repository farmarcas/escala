import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useMutation } from '@/hooks/useMutation';
import { useEmployeeForm } from '../hooks/useEmployeeForm';
import { ACCESS_ROLE_OPTIONS, AREA_OPTIONS } from '../labels';
import type { EmployeeAccessRole, EmployeeArea, EmployeeDetail, EmployeeInput } from '../types';

type EmployeeFormModalProps = {
  isOpen: boolean;
  employee?: EmployeeDetail;
  onClose: () => void;
  onCreate?: (input: EmployeeInput) => Promise<void>;
  onUpdate?: (changes: Partial<EmployeeInput>) => Promise<void>;
};

// Montado só quando aberto: o formulário sempre começa com os dados atuais.
export function EmployeeFormModal(props: EmployeeFormModalProps) {
  if (!props.isOpen) return null;
  return <EmployeeFormDialog {...props} />;
}

function EmployeeFormDialog({ employee, onClose, onCreate, onUpdate }: EmployeeFormModalProps) {
  const isEdit = Boolean(employee);
  const form = useEmployeeForm(employee);
  const { run, isPending, error } = useMutation();
  const errors = form.errorsFrom(error);
  const formId = isEdit ? 'employee-edit-form' : 'employee-new-form';
  const emailTaken = error?.code === 'EMPLOYEE_EMAIL_TAKEN' ? error.message : undefined;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.validate()) return;
    const ok = await run(async () => {
      if (isEdit) {
        const changes = form.toChanges();
        if (Object.keys(changes).length > 0) await onUpdate?.(changes);
      } else {
        await onCreate?.(form.toInput());
      }
    });
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      size="lg"
      title={isEdit ? 'Editar funcionário' : 'Novo funcionário'}
      subtitle={employee ? employee.name : 'Pessoa da Farmarcas que usa a Radar Suite'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isEdit ? 'Salvar alterações' : 'Cadastrar funcionário'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && !emailTaken && Object.keys(errors).length === 0 && (
          <InlineAlert>{error.message}</InlineAlert>
        )}
        <TextField
          label="Nome completo"
          isRequired
          value={form.values.name}
          onChange={(event) => form.setField('name', event.target.value)}
          errorMessage={errors.name}
        />
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <TextField
            label="E-mail corporativo"
            isRequired
            type="email"
            value={form.values.email}
            onChange={(event) => form.setField('email', event.target.value)}
            errorMessage={errors.email ?? emailTaken}
            placeholder="nome@farmarcas.com.br"
          />
          <TextField
            label="Telefone"
            inputMode="tel"
            value={form.values.phone}
            onChange={(event) => form.setField('phone', event.target.value)}
            errorMessage={errors.phone}
            placeholder="(11) 90000-0000"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Área"
            isRequired
            placeholder="Escolha a área"
            options={AREA_OPTIONS}
            value={form.values.area}
            onChange={(event) => form.setField('area', event.target.value as EmployeeArea)}
            errorMessage={errors.area}
          />
          <TextField
            label="Cargo"
            isRequired
            value={form.values.jobTitle}
            onChange={(event) => form.setField('jobTitle', event.target.value)}
            errorMessage={errors.jobTitle}
            placeholder="Ex.: Analista de relacionamento"
          />
        </div>
        <SelectField
          label="Papel de acesso ao Backoffice"
          isRequired
          placeholder="Escolha o papel"
          options={ACCESS_ROLE_OPTIONS}
          value={form.values.accessRole}
          onChange={(event) =>
            form.setField('accessRole', event.target.value as EmployeeAccessRole)
          }
          errorMessage={errors.accessRole}
          hint="Hoje serve de referência. Com o login, o papel passa a vir do provedor de identidade."
        />
      </form>
    </Modal>
  );
}
