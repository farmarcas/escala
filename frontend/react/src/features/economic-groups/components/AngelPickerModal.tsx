import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';
import { useMutation } from '@/hooks/useMutation';
import { pluralize } from '@/lib/format';

const REMOVE = 'REMOVE';

type AngelPickerModalProps = {
  isOpen: boolean;
  title: string;
  subtitle: string;
  currentId?: string | null;
  // No grupo, dá para retirar o Anjo; no lote, só atribuir.
  canRemove?: boolean;
  onClose: () => void;
  onConfirm: (employeeId: string | null) => Promise<void>;
};

// Escolha do Anjo entre os funcionários ativos da Farmarcas.
export function AngelPickerModal(props: AngelPickerModalProps) {
  if (!props.isOpen) return null;
  return <AngelPickerDialog {...props} />;
}

function AngelPickerDialog({
  title,
  subtitle,
  currentId = null,
  canRemove = false,
  onClose,
  onConfirm,
}: AngelPickerModalProps) {
  const { options, isLoading } = useEmployeeOptions();
  const [choice, setChoice] = useState(currentId ?? '');
  const { run, isPending, error } = useMutation();
  const isUnchanged = (choice === REMOVE ? null : choice || undefined) === (currentId ?? undefined);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!choice || isUnchanged) return;
    const ok = await run(() => onConfirm(choice === REMOVE ? null : choice));
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="angel-picker-form"
            disabled={!choice || isUnchanged || isPending}
          >
            {choice === REMOVE ? 'Retirar Anjo' : 'Salvar Anjo'}
          </Button>
        </>
      }
    >
      <form id="angel-picker-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          O Anjo é a pessoa da Farmarcas que acompanha o grupo. Ele aparece no grupo, nas lojas e na
          página da loja, e a troca fica na auditoria do grupo.
        </p>
        {error && <InlineAlert>{error.message}</InlineAlert>}
        <SelectField
          label="Anjo"
          isRequired
          placeholder={isLoading ? 'Carregando funcionários…' : 'Escolha um funcionário ativo'}
          options={[
            ...options.map((option) => ({
              value: option.id,
              label: `${option.name} · ${option.jobTitle} · ${pluralize(option.portfolioCount, 'grupo', 'grupos')}`,
            })),
            ...(canRemove && currentId ? [{ value: REMOVE, label: 'Sem Anjo (retirar)' }] : []),
          ]}
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          hint="Só funcionários ativos aparecem. Cadastre novas pessoas em Funcionários."
        />
      </form>
    </Modal>
  );
}
