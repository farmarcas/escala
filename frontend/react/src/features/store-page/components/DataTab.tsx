import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { InlineAlert } from '@/components/ui/States';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { formatCnpj, formatDate, formatPhone, formatZip } from '@/lib/format';
import { UF_OPTIONS } from '@/lib/uf';
import type { BasicEditor } from '../hooks/useBasicEditor';
import type { Catalog } from '../hooks/useCatalog';
import { BASIC_FIELD_UI, TAX_REGIME_LABEL } from '../labels';
import type { BasicKey, RequestType, StorePage } from '../types';
import { FieldView } from './FieldView';
import { StructureSection } from './StructureSection';

type DataTabProps = {
  page: StorePage;
  editor: BasicEditor;
  catalog: Catalog;
  openRequestTypes: RequestType[];
  onRequest: (type: RequestType) => void;
  onSave: () => void;
};

type SectionProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

function Section({ title, description, actions, children }: SectionProps) {
  return (
    <section className="border-b border-subtle px-5 py-5 last:border-b-0">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {actions}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">{children}</div>
    </section>
  );
}

const REQUEST_ACTIONS: { type: RequestType; label: string; inProgress: string }[] = [
  { type: 'CNPJ', label: 'Mudar CNPJ', inProgress: 'Mudança de CNPJ em andamento' },
  { type: 'ADDRESS', label: 'Mudar endereço', inProgress: 'Mudança de endereço em andamento' },
  { type: 'BRAND', label: 'Trocar bandeira', inProgress: 'Troca de bandeira em andamento' },
  { type: 'TAX_REGIME', label: 'Mudar regime', inProgress: 'Mudança de regime em andamento' },
];

function displayBasic(key: BasicKey, value: string | null): string | null {
  if (!value) return null;
  const kind = BASIC_FIELD_UI[key].kind;
  if (kind === 'phone') return formatPhone(value);
  if (kind === 'zip') return formatZip(value);
  if (kind === 'date') return formatDate(value);
  return value;
}

export function DataTab({
  page,
  editor,
  catalog,
  openRequestTypes,
  onRequest,
  onSave,
}: DataTabProps) {
  const busy = (type: RequestType) => openRequestTypes.includes(type);
  const lockNote = (type: RequestType) =>
    busy(type) ? REQUEST_ACTIONS.find((action) => action.type === type)?.inProgress : undefined;
  const requestButtons = (types: RequestType[]) =>
    page.permissions.canOpenRequest ? (
      <div className="flex flex-wrap gap-2">
        {types.map((type) => {
          const action = REQUEST_ACTIONS.find((item) => item.type === type)!;
          return (
            <Button
              key={type}
              size="sm"
              variant="secondary"
              disabled={busy(type)}
              title={busy(type) ? 'Já existe uma solicitação deste tipo em andamento' : undefined}
              onClick={() => onRequest(type)}
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    ) : null;

  const basicField = (key: BasicKey, className?: string) => {
    const ui = BASIC_FIELD_UI[key];
    if (editor.isEditing && editor.draft && editor.editable(key)) {
      if (ui.kind === 'uf') {
        return (
          <SelectField
            key={key}
            label={ui.label}
            placeholder="UF"
            options={UF_OPTIONS}
            value={editor.draft[key]}
            onChange={(event) => editor.setField(key, event.target.value)}
            errorMessage={editor.fieldErrors[key]}
            className={className}
          />
        );
      }
      return (
        <TextField
          key={key}
          label={ui.label}
          type={ui.kind === 'date' ? 'date' : ui.kind === 'email' ? 'email' : 'text'}
          inputMode={ui.kind === 'phone' || ui.kind === 'zip' ? 'numeric' : undefined}
          value={editor.draft[key]}
          onChange={(event) => editor.setField(key, event.target.value)}
          errorMessage={editor.fieldErrors[key]}
          className={className}
        />
      );
    }
    const isPrivateLocked = ui.isOwnerPrivate && page.side === 'platform';
    return (
      <FieldView
        key={key}
        label={ui.label}
        value={displayBasic(key, page.basic[key])}
        meta={page.fieldMeta[key]}
        hint={isPrivateLocked ? 'Só o grupo altera' : ui.hint}
        className={className}
      />
    );
  };

  const r = page.receita;
  return (
    <div>
      {editor.isEditing && (
        <div className="sticky top-16 z-10 flex flex-wrap items-end gap-3 border-b border-border bg-primary-tint px-5 py-3">
          <div className="min-w-0 flex-1 basis-60">
            <p className="text-sm font-semibold">Editando dados básicos</p>
            <p className="text-xs text-muted-foreground">
              {editor.changeCount === 0
                ? 'Nenhuma alteração ainda'
                : `${editor.changeCount} ${editor.changeCount === 1 ? 'alteração' : 'alterações'} · cada uma entra no histórico`}
            </p>
          </div>
          {editor.needsReason && (
            <TextArea
              label="Motivo da correção"
              isRequired
              value={editor.reason}
              onChange={(event) => editor.setReason(event.target.value)}
              placeholder="O grupo vê este motivo no histórico"
              className="min-w-[260px] flex-1 [&_textarea]:min-h-12"
            />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={editor.cancel}>
              Cancelar
            </Button>
            <Button disabled={!editor.canSave} onClick={onSave}>
              Salvar
            </Button>
          </div>
          {editor.error && editor.error.code !== 'VALIDATION_ERROR' && (
            <div className="basis-full">
              <InlineAlert>{editor.error.message}</InlineAlert>
            </div>
          )}
        </div>
      )}

      <Section
        title="Identificação na Receita"
        description="Dados sensíveis · mudam só por solicitação, com etapas e documentos"
        actions={requestButtons(['CNPJ', 'ADDRESS'])}
      >
        <FieldView
          label="CNPJ"
          value={formatCnpj(r.cnpj)}
          isLocked
          isMono
          lockNote={lockNote('CNPJ')}
        />
        <FieldView label="Inscrição estadual" value={r.stateRegistration} isLocked isMono />
        <FieldView label="Razão social" value={r.legalName} isLocked className="col-span-full" />
        <FieldView
          label="CEP"
          value={r.zip ? formatZip(r.zip) : null}
          isLocked
          isMono
          lockNote={lockNote('ADDRESS')}
        />
        <FieldView label="Logradouro" value={r.street} isLocked />
        <FieldView label="Número" value={r.number} isLocked />
        <FieldView label="Bairro" value={r.district} isLocked />
        <FieldView label="Cidade" value={r.city} isLocked />
        <FieldView label="UF" value={r.uf} isLocked />
      </Section>

      <Section
        title="Rede e negócio"
        description="Bandeira e regime mudam por solicitação; os demais em Editar dados básicos"
        actions={requestButtons(['BRAND', 'TAX_REGIME'])}
      >
        <FieldView
          label="Bandeira · marca Farmarcas"
          value={page.business.brand.name}
          isLocked
          lockNote={lockNote('BRAND')}
        />
        <FieldView
          label="Regime tributário"
          value={
            page.business.taxRegime ? (TAX_REGIME_LABEL[page.business.taxRegime] ?? null) : null
          }
          isLocked
          lockNote={lockNote('TAX_REGIME')}
          hint="Usado nos encargos do módulo Escala"
        />
        {basicField('storeCategory')}
        {basicField('affiliatedNetwork')}
        {basicField('openedAt')}
      </Section>

      <Section
        title="Dados básicos e contato"
        description={
          page.side === 'platform'
            ? 'Mantidos pelo grupo · a Farmarcas pode corrigir com motivo, e o grupo vê no histórico'
            : 'Edite em Editar dados básicos · cada mudança entra no histórico'
        }
      >
        {basicField('name')}
        {basicField('tradeName')}
        {basicField('phone1')}
        {basicField('phone2')}
        {basicField('whatsapp')}
        {basicField('deliveryPhone')}
        {basicField('email')}
        {basicField('ownerMobile')}
        {basicField('ownerPersonalEmail')}
      </Section>

      <Section
        title="Endereço popular"
        description="Como o cliente encontra a loja · pode ser diferente do endereço da Receita"
      >
        {basicField('popZip')}
        {basicField('popStreet')}
        {basicField('popNumber')}
        {basicField('popDistrict')}
        {basicField('popComplement')}
        {basicField('popCity')}
        {basicField('popUf')}
      </Section>

      <StructureSection page={page} editor={editor} catalog={catalog} />
    </div>
  );
}
