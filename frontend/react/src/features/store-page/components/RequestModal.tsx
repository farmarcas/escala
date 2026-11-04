import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useMutation } from '@/hooks/useMutation';
import { cn } from '@/lib/cn';
import { fieldErrors } from '@/lib/api';
import { formatCnpj, formatZip, onlyDigits } from '@/lib/format';
import { UF_OPTIONS } from '@/lib/uf';
import type { NewRequest } from '../hooks/useChangeRequests';
import { useSideBrands } from '../hooks/useSideBrands';
import { TAX_REGIME_LABEL } from '../labels';
import type { RequestType, StorePage } from '../types';

type FieldDef = {
  key: string;
  label: string;
  current: (page: StorePage) => string | null;
  kind?: 'cnpj' | 'zip' | 'uf' | 'brand' | 'regime';
  isWide?: boolean;
};

const TYPES: Record<
  RequestType,
  {
    title: string;
    description: string;
    steps: string;
    fields: FieldDef[];
    documents: { docType: string; label: string }[];
    effect: string;
  }
> = {
  CNPJ: {
    title: 'Mudança de CNPJ',
    description: 'Troca de CNPJ, razão social ou inscrição estadual',
    steps:
      'Solicitação → Validação na Receita · sistema → Análise de documentos · Farmarcas → Atualização nos sistemas · Farmarcas → Vigente',
    fields: [
      { key: 'cnpj', label: 'Novo CNPJ', kind: 'cnpj', current: (p) => formatCnpj(p.receita.cnpj) },
      {
        key: 'stateRegistration',
        label: 'Nova inscrição estadual',
        current: (p) => p.receita.stateRegistration,
      },
      {
        key: 'legalName',
        label: 'Nova razão social',
        isWide: true,
        current: (p) => p.receita.legalName,
      },
    ],
    documents: [
      { docType: 'CNPJ_CARD', label: 'Cartão CNPJ novo' },
      { docType: 'ARTICLES', label: 'Contrato social ou alteração contratual' },
    ],
    effect: 'O CNPJ atual vai para o histórico e a loja passa a usar o novo.',
  },
  ADDRESS: {
    title: 'Mudança de endereço',
    description: 'Endereço registrado na Receita',
    steps:
      'Solicitação → Envio de documentos · grupo → Análise Farmarcas · Farmarcas → Vistoria da nova loja · Farmarcas → Vigente',
    fields: [
      {
        key: 'zip',
        label: 'CEP',
        kind: 'zip',
        current: (p) => (p.receita.zip ? formatZip(p.receita.zip) : null),
      },
      { key: 'street', label: 'Logradouro', isWide: true, current: (p) => p.receita.street },
      { key: 'number', label: 'Número', current: (p) => p.receita.number },
      { key: 'district', label: 'Bairro', current: (p) => p.receita.district },
      { key: 'city', label: 'Cidade', current: (p) => p.receita.city },
      { key: 'uf', label: 'UF', kind: 'uf', current: (p) => p.receita.uf },
    ],
    documents: [
      { docType: 'ADDRESS_PROOF', label: 'Comprovante do novo endereço' },
      { docType: 'OPERATING_PERMIT', label: 'Alvará de funcionamento' },
      { docType: 'SANITARY_LICENSE', label: 'Licença sanitária' },
    ],
    effect: 'Troca o endereço da Receita. Mudança de UF exige nova inscrição estadual.',
  },
  BRAND: {
    title: 'Troca de bandeira',
    description: 'Marca Farmarcas da loja',
    steps:
      'Pedido → Comitê de marcas · Farmarcas → Ciência do grupo · grupo → Implantação da fachada · grupo → Vigente',
    fields: [
      {
        key: 'brandId',
        label: 'Nova marca Farmarcas',
        kind: 'brand',
        current: (p) => p.business.brand.name,
      },
    ],
    documents: [],
    effect: 'Muda a marca da loja em Grupos econômicos e Marcas Farmarcas.',
  },
  TAX_REGIME: {
    title: 'Mudança de regime tributário',
    description: 'Simples, Presumido ou Real',
    steps: 'Solicitação → Análise contábil · Farmarcas → Vigente',
    fields: [
      {
        key: 'taxRegime',
        label: 'Novo regime',
        kind: 'regime',
        current: (p) =>
          p.business.taxRegime ? (TAX_REGIME_LABEL[p.business.taxRegime] ?? null) : null,
      },
    ],
    documents: [{ docType: 'OPTION_TERM', label: 'Termo de opção' }],
    effect: 'Muda os encargos usados no módulo Escala.',
  },
};

type RequestModalProps = {
  page: StorePage;
  initialType: RequestType | null;
  busyTypes: RequestType[];
  onClose: () => void;
  onCreate: (input: NewRequest) => Promise<void>;
};

export function RequestModal(props: RequestModalProps) {
  if (!props.initialType) return null;
  return <RequestDialog {...props} initialType={props.initialType} />;
}

function RequestDialog({
  page,
  initialType,
  busyTypes,
  onClose,
  onCreate,
}: RequestModalProps & { initialType: RequestType }) {
  const [type, setType] = useState<RequestType>(initialType);
  const [values, setValues] = useState<Record<string, string>>({});
  const [effectiveDate, setEffectiveDate] = useState('');
  const [justification, setJustification] = useState('');
  const [files, setFiles] = useState<Record<string, File>>({});
  const { run, isPending, error } = useMutation();
  const brands = useSideBrands(page.side, type === 'BRAND');
  const definition = TYPES[type];
  const remote = fieldErrors(error);
  const isComplete =
    definition.fields.every((field) => (values[field.key] ?? '').trim() !== '') &&
    justification.trim() !== '';

  const chooseType = (next: RequestType) => {
    setType(next);
    setValues({});
    setFiles({});
  };

  const setValue = (field: FieldDef, raw: string) => {
    const value =
      field.kind === 'cnpj' ? formatCnpj(raw) : field.kind === 'zip' ? formatZip(raw) : raw;
    setValues((current) => ({ ...current, [field.key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isComplete) return;
    const payload = Object.fromEntries(
      definition.fields.map((field) => {
        const value = values[field.key] ?? '';
        return [
          field.key,
          field.kind === 'cnpj' || field.kind === 'zip' ? onlyDigits(value) : value.trim(),
        ];
      }),
    );
    const ok = await run(() =>
      onCreate({
        type,
        values: payload,
        justification: justification.trim(),
        effectiveDate: effectiveDate || undefined,
        files,
      }),
    );
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen
      size="lg"
      title="Nova solicitação"
      subtitle={
        page.side === 'tenant'
          ? 'Você acompanha cada etapa no painel Solicitações'
          : 'A Farmarcas registra; o grupo acompanha em Solicitações'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="request-form" disabled={!isComplete || isPending}>
            {page.side === 'tenant' ? 'Enviar solicitação' : 'Registrar solicitação'}
          </Button>
        </>
      }
    >
      <form id="request-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-secondary-foreground">
            O que vai mudar
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(TYPES) as RequestType[]).map((key) => {
              const isBusy = busyTypes.includes(key);
              const isSelected = key === type;
              return (
                <label
                  key={key}
                  title={TYPES[key].steps}
                  className={cn(
                    'flex items-start gap-3 rounded-md p-3.5',
                    isSelected
                      ? 'border-2 border-primary bg-primary-tint p-[13px]'
                      : 'border border-border bg-surface',
                    isBusy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    name="request-type"
                    checked={isSelected}
                    disabled={isBusy}
                    onChange={() => chooseType(key)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{TYPES[key].title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {isBusy ? 'Já em andamento' : TYPES[key].description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Etapas: {definition.steps}</p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {definition.fields.map((field) => {
            const hint = `Atual: ${field.current(page) ?? '—'}`;
            const errorMessage = remote[`values.${field.key}`];
            if (field.kind === 'uf' || field.kind === 'brand' || field.kind === 'regime') {
              const options =
                field.kind === 'uf'
                  ? UF_OPTIONS
                  : field.kind === 'brand'
                    ? brands
                        .filter((brand) => brand.id !== page.business.brand.id)
                        .map((brand) => ({ value: brand.id, label: brand.name }))
                    : Object.entries(TAX_REGIME_LABEL)
                        .filter(([value]) => value !== page.business.taxRegime)
                        .map(([value, label]) => ({ value, label }));
              return (
                <SelectField
                  key={field.key}
                  label={field.label}
                  isRequired
                  placeholder="Escolha"
                  options={options}
                  value={values[field.key] ?? ''}
                  onChange={(event) => setValue(field, event.target.value)}
                  hint={hint}
                  errorMessage={errorMessage}
                  className={field.isWide ? 'sm:col-span-2' : undefined}
                />
              );
            }
            return (
              <TextField
                key={field.key}
                label={field.label}
                isRequired
                inputMode={field.kind ? 'numeric' : undefined}
                value={values[field.key] ?? ''}
                onChange={(event) => setValue(field, event.target.value)}
                hint={hint}
                errorMessage={errorMessage}
                className={field.isWide ? 'sm:col-span-2' : undefined}
              />
            );
          })}
          <TextField
            label="Vale a partir de"
            type="date"
            value={effectiveDate}
            onChange={(event) => setEffectiveDate(event.target.value)}
          />
        </div>

        {definition.documents.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-secondary-foreground">
              Documentos · pode enviar depois: o pedido aguarda até completar
            </legend>
            {definition.documents.map((doc) => (
              <label
                key={doc.docType}
                className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-control bg-background px-3.5 py-2.5 text-[13px]"
              >
                <span className="min-w-0 flex-1 font-medium">{doc.label}</span>
                <span className="text-xs text-muted-foreground">
                  {files[doc.docType]?.name ?? 'PDF, JPG ou PNG até 10 MB'}
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="text-xs file:mr-2 file:rounded-sm file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-xs"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setFiles((current) => {
                      const next = { ...current };
                      if (file) next[doc.docType] = file;
                      else delete next[doc.docType];
                      return next;
                    });
                  }}
                />
              </label>
            ))}
          </fieldset>
        )}

        <TextArea
          label="Justificativa"
          isRequired
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          placeholder="Explique o motivo do pedido"
        />
        <p className="text-xs text-muted-foreground">
          Efeito: {definition.effect} O dado atual vale até a solicitação ficar vigente.
        </p>
        {error && <InlineAlert>{error.message}</InlineAlert>}
      </form>
    </Modal>
  );
}
