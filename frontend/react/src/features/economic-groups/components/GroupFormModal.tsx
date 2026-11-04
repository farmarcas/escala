import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useMutation } from '@/hooks/useMutation';
import { formatGroupNumber } from '@/lib/format';
import { useGroupForm } from '../hooks/useGroupForm';
import type { GroupDetail, GroupInput } from '../types';

type GroupFormModalProps = {
  isOpen: boolean;
  group?: GroupDetail;
  onClose: () => void;
  onCreate?: (input: GroupInput) => Promise<void>;
  onUpdate?: (changes: Partial<GroupInput>) => Promise<void>;
};

// Montado só quando aberto: o formulário sempre começa com os dados atuais do grupo.
export function GroupFormModal(props: GroupFormModalProps) {
  if (!props.isOpen) return null;
  return <GroupFormDialog {...props} />;
}

function GroupFormDialog({ group, onClose, onCreate, onUpdate }: GroupFormModalProps) {
  const isEdit = Boolean(group);
  const form = useGroupForm(group);
  const { run, isPending, error } = useMutation();
  const errors = form.errorsFrom(error);
  const formId = isEdit ? 'group-edit-form' : 'group-new-form';
  // Quem já é dono não é trocado pela edição: isso é transferência de titularidade.
  const isOwnerLocked = Boolean(group?.owner);

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
      title={isEdit ? 'Editar grupo' : 'Novo grupo econômico'}
      subtitle={
        group
          ? `${group.name} · GE ${formatGroupNumber(group.number)}`
          : 'O número do GE é emitido ao salvar'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isEdit ? 'Salvar alterações' : 'Cadastrar grupo'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-semibold">Identificação</legend>
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <TextField
              label="Número do GE"
              value={group ? formatGroupNumber(group.number) : 'Emitido ao salvar'}
              disabled
              hint="Emitido pela Farmarcas, não pode ser alterado"
            />
            <TextField
              label="Nome do grupo"
              isRequired
              value={form.values.name}
              onChange={(event) => form.setField('name', event.target.value)}
              errorMessage={errors.name}
              placeholder="Nome do grupo econômico"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <TextField
              label="Razão social da matriz"
              isRequired
              value={form.values.legalName}
              onChange={(event) => form.setField('legalName', event.target.value)}
              errorMessage={errors.legalName}
            />
            <TextField
              label="CNPJ da matriz"
              isRequired
              inputMode="numeric"
              value={form.values.cnpj}
              onChange={(event) => form.setField('cnpj', event.target.value)}
              errorMessage={errors.cnpj}
              placeholder="00.000.000/0000-00"
            />
          </div>
        </fieldset>

        <fieldset
          disabled={isOwnerLocked}
          className="flex flex-col gap-4 border-t border-border pt-5"
        >
          <legend className="sr-only">Proprietário</legend>
          <div>
            <p className="text-sm font-semibold">Proprietário</p>
            <p className="text-xs text-muted-foreground">
              {isOwnerLocked
                ? 'Para trocar o proprietário, use Transferir titularidade, no detalhe do grupo. A troca pede justificativa e gera um novo código para a nova pessoa.'
                : 'Departamento Sócio · primeiro administrador do grupo. Opcional: sem ele, o grupo fica com o selo “Sem proprietário”.'}
            </p>
          </div>
          <TextField
            label="Nome"
            value={form.values.ownerName}
            onChange={(event) => form.setField('ownerName', event.target.value)}
            errorMessage={errors.ownerName}
            placeholder="Nome completo"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="E-mail"
              type="email"
              value={form.values.ownerEmail}
              onChange={(event) => form.setField('ownerEmail', event.target.value)}
              errorMessage={errors.ownerEmail}
              placeholder="email@empresa.com.br"
            />
            <TextField
              label="Telefone"
              inputMode="tel"
              value={form.values.ownerPhone}
              onChange={(event) => form.setField('ownerPhone', event.target.value)}
              errorMessage={errors.ownerPhone}
              placeholder="(00) 00000-0000"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Nome, e-mail e telefone são dados pessoais: só o Administrador da plataforma vê. O
            analista vê o proprietário por código.
          </p>
        </fieldset>

        {error && !error.details.length && <InlineAlert>{error.message}</InlineAlert>}
      </form>
    </Modal>
  );
}
