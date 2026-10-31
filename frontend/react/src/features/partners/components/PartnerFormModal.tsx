import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useMutation } from '@/hooks/useMutation';
import { fieldErrors } from '@/lib/api';
import { formatCnpj, onlyDigits } from '@/lib/format';
import { TYPE_OPTIONS } from '../labels';
import type { PartnerDetail, PartnerInput, PartnerType } from '../types';

type PartnerFormModalProps = {
  isOpen: boolean;
  partner?: PartnerDetail;
  onClose: () => void;
  onCreate?: (input: PartnerInput) => Promise<void>;
  onUpdate?: (changes: Partial<PartnerInput>) => Promise<void>;
};

// Montado só quando aberto: o formulário sempre começa com os dados atuais.
export function PartnerFormModal(props: PartnerFormModalProps) {
  if (!props.isOpen) return null;
  return <PartnerFormDialog {...props} />;
}

function PartnerFormDialog({ partner, onClose, onCreate, onUpdate }: PartnerFormModalProps) {
  const isEdit = Boolean(partner);
  const [values, setValues] = useState({
    type: partner?.type ?? ('' as PartnerType | ''),
    cnpj: partner ? formatCnpj(partner.cnpj) : '',
    legalName: partner?.legalName ?? '',
    tradeName: partner?.tradeName ?? '',
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const { run, isPending, error } = useMutation();
  const errors = { ...fieldErrors(error), ...localErrors };
  const cnpjTaken = error?.code === 'PARTNER_CNPJ_TAKEN' ? error.message : undefined;
  const formId = isEdit ? 'partner-edit-form' : 'partner-new-form';

  const setField = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: field === 'cnpj' ? formatCnpj(value) : value }));
    setLocalErrors((current) => {
      const { [field]: _removed, ...rest } = current;
      return rest;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const issues: Record<string, string> = {};
    if (!values.type) issues.type = 'Escolha o tipo';
    if (onlyDigits(values.cnpj).length !== 14) issues.cnpj = 'O CNPJ tem 14 dígitos';
    if (values.legalName.trim().length < 2) issues.legalName = 'Informe a razão social';
    if (values.tradeName.trim().length < 2) issues.tradeName = 'Informe o nome fantasia';
    setLocalErrors(issues);
    if (Object.keys(issues).length > 0) return;

    const input: PartnerInput = {
      type: values.type as PartnerType,
      cnpj: onlyDigits(values.cnpj),
      legalName: values.legalName.trim(),
      tradeName: values.tradeName.trim(),
    };
    const ok = await run(async () => {
      if (!partner) return onCreate?.(input);
      const changes = Object.fromEntries(
        (Object.keys(input) as (keyof PartnerInput)[])
          .filter((key) => input[key] !== partner[key])
          .map((key) => [key, input[key]]),
      );
      if (Object.keys(changes).length > 0) await onUpdate?.(changes);
    });
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      title={isEdit ? 'Editar parceiro' : 'Novo parceiro'}
      subtitle={
        partner ? partner.tradeName : 'Indústria ou distribuidor com quem a Farmarcas trabalha'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isEdit ? 'Salvar alterações' : 'Cadastrar parceiro'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && !cnpjTaken && Object.keys(fieldErrors(error)).length === 0 && (
          <InlineAlert>{error.message}</InlineAlert>
        )}
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <SelectField
            label="Tipo"
            isRequired
            placeholder="Escolha"
            options={TYPE_OPTIONS}
            value={values.type}
            onChange={(event) => setField('type', event.target.value)}
            errorMessage={errors.type}
          />
          <TextField
            label="CNPJ"
            isRequired
            inputMode="numeric"
            value={values.cnpj}
            onChange={(event) => setField('cnpj', event.target.value)}
            errorMessage={errors.cnpj ?? cnpjTaken}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <TextField
          label="Razão social"
          isRequired
          value={values.legalName}
          onChange={(event) => setField('legalName', event.target.value)}
          errorMessage={errors.legalName}
        />
        <TextField
          label="Nome fantasia"
          isRequired
          value={values.tradeName}
          onChange={(event) => setField('tradeName', event.target.value)}
          errorMessage={errors.tradeName}
          hint="É o nome que aparece nas listas."
        />
      </form>
    </Modal>
  );
}
