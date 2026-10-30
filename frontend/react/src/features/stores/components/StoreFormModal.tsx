import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useBrandOptions } from '@/hooks/useBrandOptions';
import { useMutation } from '@/hooks/useMutation';
import { cn } from '@/lib/cn';
import { formatGroupNumber } from '@/lib/format';
import { UF_OPTIONS } from '@/lib/uf';
import { useStoreForm } from '../hooks/useStoreForm';
import type { StoreGroupContext, StoreInput, StoreType } from '../types';

type StoreFormModalProps = {
  isOpen: boolean;
  group: StoreGroupContext;
  onClose: () => void;
  onCreate: (input: StoreInput) => Promise<void>;
};

export function StoreFormModal(props: StoreFormModalProps) {
  if (!props.isOpen) return null;
  return <StoreFormDialog {...props} />;
}

const TYPE_OPTIONS: { value: StoreType; title: string; description: string }[] = [
  { value: 'PDV', title: 'PDV', description: 'Ponto de venda, atende o consumidor' },
  { value: 'CD', title: 'CD', description: 'Centro de distribuição, abastece os PDVs' },
];

function StoreFormDialog({ group, onClose, onCreate }: StoreFormModalProps) {
  const form = useStoreForm();
  const brands = useBrandOptions();
  const { run, isPending, error } = useMutation();
  const errors = form.errorsFrom(error);
  const isGeneralError = error && !error.details.length && !errors.cnpj && !errors.brandId;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.validate()) return;
    if (await run(() => onCreate(form.toInput()))) onClose();
  };

  return (
    <Modal
      isOpen
      size="lg"
      title="Adicionar loja"
      subtitle={`${group.name} · GE ${formatGroupNumber(group.number)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="store-form" disabled={isPending}>
            Salvar loja
          </Button>
        </>
      }
    >
      <form id="store-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nome da loja"
          isRequired
          value={form.values.name}
          onChange={(event) => form.setField('name', event.target.value)}
          errorMessage={errors.name}
          placeholder="Drogaria Aurora Moema"
        />

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-secondary-foreground">
            Tipo de loja <span aria-hidden="true">*</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPE_OPTIONS.map((option) => {
              const isSelected = form.values.type === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md p-3.5',
                    isSelected
                      ? 'border-2 border-primary bg-primary-tint p-[13px]'
                      : 'border border-border bg-surface',
                  )}
                >
                  <input
                    type="radio"
                    name="store-type"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => form.setType(option.value)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="CNPJ"
            isRequired
            inputMode="numeric"
            value={form.values.cnpj}
            onChange={(event) => form.setField('cnpj', event.target.value)}
            errorMessage={errors.cnpj}
            placeholder="00.000.000/0000-00"
          />
          <SelectField
            label="Marca Farmarcas"
            isRequired
            placeholder={brands.isLoading ? 'Carregando marcas…' : 'Selecione uma marca ativa'}
            options={brands.active.map((brand) => ({ value: brand.id, label: brand.name }))}
            value={form.values.brandId}
            onChange={(event) => form.setField('brandId', event.target.value)}
            errorMessage={errors.brandId}
            hint="Só marcas ativas"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <TextField
            label="Logradouro"
            isRequired
            value={form.values.street}
            onChange={(event) => form.setField('street', event.target.value)}
            errorMessage={errors.street}
            placeholder="Av. Ibirapuera"
          />
          <TextField
            label="Número"
            isRequired
            value={form.values.number}
            onChange={(event) => form.setField('number', event.target.value)}
            errorMessage={errors.number}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <TextField
            label="Bairro"
            isRequired
            value={form.values.district}
            onChange={(event) => form.setField('district', event.target.value)}
            errorMessage={errors.district}
          />
          <TextField
            label="CEP"
            inputMode="numeric"
            value={form.values.zip}
            onChange={(event) => form.setField('zip', event.target.value)}
            errorMessage={errors.zip}
            placeholder="00000-000"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_120px_180px]">
          <TextField
            label="Cidade"
            isRequired
            value={form.values.city}
            onChange={(event) => form.setField('city', event.target.value)}
            errorMessage={errors.city}
          />
          <SelectField
            label="UF"
            isRequired
            placeholder="UF"
            options={UF_OPTIONS}
            value={form.values.uf}
            onChange={(event) => form.setField('uf', event.target.value)}
            errorMessage={errors.uf}
          />
          <TextField
            label="Abertura"
            type="date"
            value={form.values.openedAt}
            onChange={(event) => form.setField('openedAt', event.target.value)}
            errorMessage={errors.openedAt}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          O código da loja é gerado no cadastro. Ao salvar, a loja fica como “Pendente no grupo” até
          o grupo verificar e completar os dados estratégicos.
        </p>

        {isGeneralError && <InlineAlert>{error.message}</InlineAlert>}
      </form>
    </Modal>
  );
}
