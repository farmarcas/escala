import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useMutation } from '@/hooks/useMutation';
import { fieldErrors, type Paginated } from '@/lib/api';
import { formatStoreCode, onlyDigits } from '@/lib/format';
import type { BenefitCardInput, GroupDetail } from '../types';

type StoreOption = { code: number; name: string; cnpj: string; status: string };

type BenefitCardModalProps = {
  group: GroupDetail;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: BenefitCardInput) => Promise<void>;
};

// Cartão Alelo do grupo (spec 003, US6). Os dados pessoais nunca voltam da API: ao editar,
// CPF, nascimento e número são digitados de novo. Trocar o CPF é trocar o titular.
export function BenefitCardModal(props: BenefitCardModalProps) {
  if (!props.isOpen) return null;
  return <CardDialog {...props} />;
}

function formatCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function CardDialog({ group, onClose, onSave }: BenefitCardModalProps) {
  const current = group.benefitCard;
  // Só lojas ativas do grupo podem ficar com o cartão.
  const stores = useApiQuery<Paginated<StoreOption>>(
    `/economic-groups/${group.number}/stores?pageSize=100`,
  );
  const options = (stores.data?.data ?? [])
    .filter((store) => store.status === 'ACTIVE')
    .map((store) => ({
      value: String(store.code),
      label: `${formatStoreCode(store.code)} · ${store.name}`,
    }));
  const [values, setValues] = useState({
    holderName: current?.holderName ?? '',
    holderCpf: '',
    holderBirthDate: current?.holderBirthDate ?? '',
    cardNumber: '',
    storeCode: current ? String(current.store.code) : '',
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const { run, isPending, error } = useMutation();
  const errors = { ...fieldErrors(error), ...localErrors };
  const storeError =
    error?.code === 'STORE_NOT_ACTIVE' || error?.code === 'STORE_NOT_IN_GROUP'
      ? error.message
      : undefined;

  const setField = (field: keyof typeof values, value: string) => {
    setValues((now) => ({ ...now, [field]: field === 'holderCpf' ? formatCpf(value) : value }));
    setLocalErrors({});
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const issues: Record<string, string> = {};
    if (values.holderName.trim().length < 3) issues.holderName = 'Informe o nome completo';
    if (onlyDigits(values.holderCpf).length !== 11) issues.holderCpf = 'O CPF tem 11 dígitos';
    if (!values.holderBirthDate) issues.holderBirthDate = 'Informe a data de nascimento';
    const digits = onlyDigits(values.cardNumber).length;
    if (digits < 13 || digits > 19) issues.cardNumber = 'O número tem de 13 a 19 dígitos';
    if (!values.storeCode) issues.storeCode = 'Escolha a loja';
    setLocalErrors(issues);
    if (Object.keys(issues).length > 0) return;
    const ok = await run(() =>
      onSave({
        holderName: values.holderName.trim(),
        holderCpf: onlyDigits(values.holderCpf),
        holderBirthDate: values.holderBirthDate,
        cardNumber: onlyDigits(values.cardNumber),
        storeCode: Number(values.storeCode),
      }),
    );
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      size="lg"
      title={current ? 'Editar Cartão Alelo' : 'Cadastrar Cartão Alelo'}
      subtitle={`${group.name} · cartão de benefício vinculado a uma loja do grupo`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="benefit-card-form" disabled={isPending}>
            Salvar cartão
          </Button>
        </>
      }
    >
      <form
        id="benefit-card-form"
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        {error && !storeError && Object.keys(fieldErrors(error)).length === 0 && (
          <InlineAlert>{error.message}</InlineAlert>
        )}
        <TextField
          label="Nome do titular"
          isRequired
          value={values.holderName}
          onChange={(event) => setField('holderName', event.target.value)}
          errorMessage={errors.holderName}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="CPF do titular"
            isRequired
            inputMode="numeric"
            value={values.holderCpf}
            onChange={(event) => setField('holderCpf', event.target.value)}
            errorMessage={errors.holderCpf}
            placeholder="000.000.000-00"
            hint={
              current ? `Hoje: ${current.holderCpfMasked}. Outro CPF troca o titular.` : undefined
            }
          />
          <TextField
            label="Data de nascimento do titular"
            isRequired
            type="date"
            value={values.holderBirthDate}
            onChange={(event) => setField('holderBirthDate', event.target.value)}
            errorMessage={errors.holderBirthDate}
          />
          <TextField
            label="Número do cartão"
            isRequired
            inputMode="numeric"
            value={values.cardNumber}
            onChange={(event) => setField('cardNumber', event.target.value)}
            errorMessage={errors.cardNumber}
            hint={
              current ? `Hoje termina em ${current.cardLast4}. Digite o número de novo.` : undefined
            }
          />
          <SelectField
            label="Loja vinculada"
            isRequired
            placeholder={stores.isLoading ? 'Carregando lojas…' : 'Escolha uma loja ativa'}
            options={options}
            value={values.storeCode}
            onChange={(event) => setField('storeCode', event.target.value)}
            errorMessage={errors.storeCode ?? storeError}
            hint="Só lojas ativas do grupo."
          />
        </div>
        <p className="text-xs text-muted-foreground">
          CPF, data de nascimento e número do cartão são dados pessoais: só o Administrador da
          plataforma vê, e o número aparece só com os 4 últimos dígitos.
        </p>
      </form>
    </Modal>
  );
}
