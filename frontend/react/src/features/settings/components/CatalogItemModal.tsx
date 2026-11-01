import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useMutation } from '@/hooks/useMutation';
import { fieldErrors } from '@/lib/api';
import {
  DEFAULT_FURNITURE_ICON,
  FURNITURE_TYPE_LABEL,
  defaultSelfService,
  furnitureIcon,
} from '@/lib/furniture-icons';
import type { CatalogListConfig } from '../catalogKinds';
import type { CatalogItemInput, SettingsCatalogItem } from '../types';
import { IconPicker } from './IconPicker';

type CatalogItemModalProps = {
  list: CatalogListConfig;
  item: SettingsCatalogItem | null;
  suggestions: string[];
  onClose: () => void;
  onCreate: (input: CatalogItemInput) => Promise<unknown>;
  onUpdate: (item: SettingsCatalogItem, input: CatalogItemInput) => Promise<unknown>;
  onReload: () => void;
};

type Values = {
  name: string;
  groupLabel: string;
  description: string;
  icon: string;
  selfService: boolean;
  usedByScale: boolean;
  negotiated: string;
};

const centsToText = (cents: number | null) =>
  cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',');

// "1.234,56" ou "490" → centavos; vazio → sem valor.
const textToCents = (text: string): number | null | 'invalid' => {
  const clean = text.trim().replace(/\./g, '').replace(',', '.');
  if (clean === '') return null;
  const value = Number(clean);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 'invalid';
};

// Formulário de inclusão e alteração de um item, com os campos da lista e a prévia do mobiliário.
export function CatalogItemModal({
  list,
  item,
  suggestions,
  onClose,
  onCreate,
  onUpdate,
  onReload,
}: CatalogItemModalProps) {
  const formId = useId();
  const suggestionsId = useId();
  const [values, setValues] = useState<Values>({
    name: item?.name ?? '',
    groupLabel: item?.groupLabel ?? '',
    description: item?.description ?? '',
    icon: item?.icon ?? DEFAULT_FURNITURE_ICON,
    selfService: item?.selfService ?? false,
    usedByScale: item?.usedByScale ?? false,
    negotiated: centsToText(item?.negotiatedMonthlyCents ?? null),
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [isRenameConfirmed, setIsRenameConfirmed] = useState(false);
  const { run, isPending, error } = useMutation();
  const errors = { ...fieldErrors(error), ...localErrors };
  const isConflict = error?.code === 'VERSION_CONFLICT';
  const isDuplicate = error?.code === 'DUPLICATE_NAME';
  const renamesInUse = item !== null && item.storesInUse > 0 && values.name.trim() !== item.name;

  const setField = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({
      ...current,
      [key]: value,
      // O tipo do mobiliário sugere o autosserviço; a pessoa pode mudar depois.
      ...(key === 'groupLabel' && list.hasSelfService
        ? { selfService: defaultSelfService(String(value)) }
        : {}),
    }));
    setLocalErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const buildInput = (): CatalogItemInput | null => {
    const issues: Record<string, string> = {};
    const input: CatalogItemInput = { name: values.name.trim() };
    if (!input.name) issues.name = 'Informe o nome';
    if (list.groupLabel) {
      input.groupLabel = values.groupLabel.trim() || null;
      if (list.groupLabel.isRequired && !input.groupLabel)
        issues.groupLabel = `Escolha o ${list.groupLabel.label.toLowerCase()}`;
    }
    if (list.itemDescription) {
      input.description = values.description.trim() || null;
      if (list.itemDescription.isRequired && !input.description)
        issues.description = `Informe ${list.itemDescription.label.toLowerCase()}`;
    }
    if (list.hasIcon) input.icon = values.icon;
    if (list.hasSelfService) input.selfService = values.selfService;
    if (list.hasUsedByScale) input.usedByScale = values.usedByScale;
    if (list.hasNegotiated) {
      const cents = textToCents(values.negotiated);
      if (cents === 'invalid') issues.negotiatedMonthlyCents = 'Use só números, ex.: 490,00';
      else input.negotiatedMonthlyCents = cents;
    }
    setLocalErrors(issues);
    return Object.keys(issues).length === 0 ? input : null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input = buildInput();
    if (!input) return;
    if (renamesInUse && !isRenameConfirmed) {
      setIsRenameConfirmed(true);
      return;
    }
    const ok = await run(async () => {
      if (!item) return onCreate(input);
      const changes = Object.fromEntries(
        Object.entries(input).filter(
          ([key, value]) => value !== item[key as keyof SettingsCatalogItem],
        ),
      );
      if (Object.keys(changes).length > 0) await onUpdate(item, changes);
    });
    if (ok) onClose();
  };

  const preview = furnitureIcon(values.icon);
  const PreviewIcon = preview.icon;
  const generalError =
    error && !isConflict && !isDuplicate && Object.keys(fieldErrors(error)).length === 0;

  return (
    <Modal
      isOpen
      size={list.hasIcon ? 'lg' : 'md'}
      title={item ? `Alterar ${item.name}` : list.newLabel}
      subtitle={list.label}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isPending || isConflict}>
            {renamesInUse && isRenameConfirmed ? 'Confirmar e salvar' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isConflict && (
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-warning-soft px-3 py-2.5 text-sm text-warning-text">
            <p className="min-w-0 flex-1">{error.message}</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onReload();
                onClose();
              }}
            >
              Recarregar
            </Button>
          </div>
        )}
        {generalError && <InlineAlert>{error.message}</InlineAlert>}
        {renamesInUse && isRenameConfirmed && (
          <p
            role="alert"
            className="rounded-md bg-warning-soft px-3 py-2.5 text-sm text-warning-text"
          >
            Este item está em uso por {item.storesInUse} {item.storesInUse === 1 ? 'loja' : 'lojas'}
            . O nome muda em todas, sem perder o que elas informaram.
          </p>
        )}
        <TextField
          label="Nome"
          isRequired
          maxLength={80}
          value={values.name}
          onChange={(event) => {
            setField('name', event.target.value);
            setIsRenameConfirmed(false);
          }}
          errorMessage={errors.name ?? (isDuplicate ? error.message : undefined)}
        />
        {list.groupLabel &&
          (list.groupLabel.options ? (
            <SelectField
              label={list.groupLabel.label}
              isRequired={list.groupLabel.isRequired}
              placeholder="Escolha"
              options={list.groupLabel.options}
              value={values.groupLabel}
              onChange={(event) => setField('groupLabel', event.target.value)}
              errorMessage={errors.groupLabel}
            />
          ) : (
            <>
              <TextField
                label={list.groupLabel.label}
                hint={list.groupLabel.hint}
                maxLength={60}
                list={suggestionsId}
                value={values.groupLabel}
                onChange={(event) => setField('groupLabel', event.target.value)}
                errorMessage={errors.groupLabel}
              />
              <datalist id={suggestionsId}>
                {suggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </>
          ))}
        {list.itemDescription && (
          <TextField
            label={list.itemDescription.label}
            isRequired={list.itemDescription.isRequired}
            hint={list.itemDescription.hint}
            maxLength={200}
            value={values.description}
            onChange={(event) => setField('description', event.target.value)}
            errorMessage={errors.description}
          />
        )}
        {list.hasNegotiated && (
          <TextField
            label="Valor mensal negociado (R$)"
            hint="Deixe em branco se não houver condição negociada"
            inputMode="decimal"
            placeholder="0,00"
            value={values.negotiated}
            onChange={(event) => setField('negotiated', event.target.value)}
            errorMessage={errors.negotiatedMonthlyCents}
          />
        )}
        {list.hasSelfService && (
          <Checkbox
            label="Conta como autosserviço"
            hint="Soma no cartão “Gôndolas e expositores” da loja"
            checked={values.selfService}
            onChange={(checked) => setField('selfService', checked)}
          />
        )}
        {list.hasUsedByScale && (
          <Checkbox
            label="Usada no módulo Escala"
            hint="Mostra a etiqueta “Usada no módulo Escala” na loja"
            checked={values.usedByScale}
            onChange={(checked) => setField('usedByScale', checked)}
          />
        )}
        {list.hasIcon && (
          <>
            <IconPicker value={values.icon} onChange={(key) => setField('icon', key)} />
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-secondary-foreground">
                Como aparece na loja
              </p>
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <PreviewIcon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {values.name.trim() || 'Nome do mobiliário'}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[FURNITURE_TYPE_LABEL[values.groupLabel], values.description.trim()]
                      .filter(Boolean)
                      .join(' · ') || 'Tipo e descrição'}
                  </span>
                </span>
              </div>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

type CheckboxProps = {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function Checkbox({ label, hint, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
