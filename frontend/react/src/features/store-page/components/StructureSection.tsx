import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { TextField } from '@/components/ui/TextField';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { BasicEditor } from '../hooks/useBasicEditor';
import type { Catalog } from '../hooks/useCatalog';
import type { FreeSection, Selections, StorePage } from '../types';
import { CheckItem } from './CheckItem';
import { FieldView } from './FieldView';
import { HoursGrid, openDaysText } from './HoursGrid';
import { SectionCard } from './SectionCard';

type StructureSectionProps = { page: StorePage; editor: BasicEditor; catalog: Catalog };

const toNumber = (value: string) =>
  value.trim() === '' ? null : Number(value.replace(/\D/g, '')) || null;

const pillClass = (isOn: boolean) =>
  cn(
    'rounded-full border px-2.5 py-1 text-xs font-semibold',
    isOn
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-surface text-secondary-foreground hover:border-primary',
  );

// Estrutura, funcionamento, serviços, sistema e PBMs: cartões da aba Estratégias (protótipo
// "Loja Detalhe"; spec 002, US5). Editados em "Editar dados básicos", com histórico.
export function StructureSection({ page, editor, catalog }: StructureSectionProps) {
  const isEditing = editor.isEditing && page.permissions.canEditBasic;
  const structure = (isEditing && editor.structure) || page.structure;
  const hours = (isEditing && editor.hours) || page.hours;
  const selections: Selections = (isEditing && editor.selections) || page.selections;
  const [openPrograms, setOpenPrograms] = useState<string[]>([]);
  const services = catalog.byKind('SERVICE');
  const tools = catalog.byKind('PRACTICE_TOOL');
  const pbms = catalog.byKind('PBM');
  const programs = [...new Set(pbms.map((item) => item.groupLabel ?? 'Outros'))];

  const numberField = (
    key: 'areaM2' | 'salesAreaM2' | 'staffCount',
    label: string,
    placeholder?: string,
  ) => {
    const value = structure[key];
    return isEditing ? (
      <TextField
        label={label}
        inputMode="numeric"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(event) => editor.setStructure({ [key]: toNumber(event.target.value) })}
      />
    ) : (
      <FieldView
        label={label}
        value={value !== null ? formatNumber(value) : null}
        meta={page.fieldMeta[key]}
      />
    );
  };

  return (
    <>
      <SectionCard
        title="Estrutura da loja"
        description="Dados básicos · editados em Editar dados básicos, com histórico"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] items-end gap-4">
          <div className="pb-3.5">
            <CheckItem
              label="Prédio próprio"
              checked={structure.ownBuilding === true}
              isEditing={isEditing}
              onToggle={() => editor.setStructure({ ownBuilding: !structure.ownBuilding })}
            />
          </div>
          {numberField('areaM2', 'Área da loja (m²)', 'm²')}
          {numberField('salesAreaM2', 'Área de venda (m²)', 'm²')}
          {numberField('staffCount', 'Número de colaboradores')}
        </div>
      </SectionCard>

      <SectionCard
        title="Funcionamento da loja"
        description={`${openDaysText(hours)} · alimenta o módulo Escala`}
      >
        <HoursGrid hours={hours} isEditing={isEditing} onChange={editor.setHours} />
      </SectionCard>

      <SectionCard
        title="Serviços oferecidos na loja"
        description={`${selections.services.length} de ${services.length} serviços`}
      >
        <fieldset className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-2.5">
          <legend className="sr-only">Serviços oferecidos</legend>
          {services.map((item) => (
            <CheckItem
              key={item.id}
              label={item.name}
              checked={selections.services.includes(item.id)}
              isEditing={isEditing}
              onToggle={() => editor.toggleSelection('services', item.id)}
            />
          ))}
        </fieldset>
      </SectionCard>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
        <SectionCard title="Sistema utilizado" description="Sistema de demanda da loja">
          <FieldView
            label="Sistema de demanda"
            value={catalog.nameOf(structure.demandSystemId)}
            meta={isEditing ? undefined : page.fieldMeta.demandSystemId}
            className="max-w-xs"
          />
          {isEditing && (
            <div
              role="radiogroup"
              aria-label="Sistema de demanda"
              className="mt-2.5 flex flex-wrap gap-1.5"
            >
              {catalog.byKind('DEMAND_SYSTEM').map((item) => {
                const isOn = structure.demandSystemId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isOn}
                    onClick={() => editor.setStructure({ demandSystemId: isOn ? null : item.id })}
                    className={pillClass(isOn)}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>
        <SectionCard
          title="Ferramentas de boas práticas"
          description={`${selections.practiceTools.length} de ${tools.length} ferramentas`}
        >
          <fieldset className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-6 gap-y-2.5">
            <legend className="sr-only">Ferramentas de boas práticas</legend>
            {tools.map((item) => (
              <CheckItem
                key={item.id}
                label={item.name}
                checked={selections.practiceTools.includes(item.id)}
                isEditing={isEditing}
                onToggle={() => editor.toggleSelection('practiceTools', item.id)}
              />
            ))}
          </fieldset>
        </SectionCard>
      </div>

      <SectionCard
        title="PBMs"
        description={`${selections.pbms.length} de ${pbms.length} programas aceitos`}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] items-start gap-3">
          {programs.map((program) => {
            const items = pbms.filter((item) => (item.groupLabel ?? 'Outros') === program);
            const chosen = items.filter((item) => selections.pbms.includes(item.id)).length;
            const isOpen = openPrograms.includes(program);
            const Arrow = isOpen ? ChevronUp : ChevronDown;
            return (
              <div key={program} className="overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenPrograms((current) =>
                      current.includes(program)
                        ? current.filter((item) => item !== program)
                        : [...current, program],
                    )
                  }
                  className={cn(
                    'flex w-full items-center gap-2 bg-background px-3.5 py-2.5 text-left',
                    isOpen && 'border-b border-border',
                  )}
                >
                  <span className="flex-1 text-sm font-bold">{program}</span>
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      chosen ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {chosen} de {items.length} selecionados
                  </span>
                  <Arrow aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </button>
                {isOpen && (
                  <fieldset className="flex flex-col gap-2 px-3.5 py-2.5">
                    <legend className="sr-only">PBMs {program}</legend>
                    {items.map((item) => (
                      <CheckItem
                        key={item.id}
                        label={item.name}
                        checked={selections.pbms.includes(item.id)}
                        isEditing={isEditing}
                        onToggle={() => editor.toggleSelection('pbms', item.id)}
                      />
                    ))}
                  </fieldset>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}

const freeInput =
  'w-full rounded-md border border-control bg-surface px-3 py-2 text-sm text-foreground focus:border-2 focus:border-primary focus:px-[11px] focus:py-[7px] focus:outline-none';

// Seções livres: a Farmarcas cria e o grupo vê; cada uma é um cartão (protótipo "Loja Detalhe").
// O cartão tracejado no fim abre a edição e já cria uma seção nova.
export function FreeSectionCards({ page, editor }: { page: StorePage; editor: BasicEditor }) {
  const canCreate = page.permissions.canEditFreeSections && page.permissions.canEditBasic;
  const canEdit = editor.isEditing && canCreate && editor.freeSections !== null;
  const sections: FreeSection[] = canEdit ? (editor.freeSections ?? []) : page.freeSections;
  const update = (index: number, next: FreeSection | null) =>
    editor.setFreeSections(
      sections.map((section, i) => (i === index ? next : section)).filter(Boolean) as FreeSection[],
    );
  const updateField = (
    index: number,
    section: FreeSection,
    fieldIndex: number,
    patch: Partial<FreeSection['fields'][number]>,
  ) =>
    update(index, {
      ...section,
      fields: section.fields.map((item, i) => (i === fieldIndex ? { ...item, ...patch } : item)),
    });

  return (
    <>
      {sections.map((section, index) => (
        <SectionCard
          key={section.id ?? `new-${index}`}
          tone="free"
          title={
            canEdit ? (
              <input
                aria-label="Nome da seção"
                placeholder="Nome da seção"
                value={section.title}
                onChange={(event) => update(index, { ...section, title: event.target.value })}
                className={cn(freeInput, 'max-w-[420px] text-[15px] font-semibold')}
              />
            ) : (
              <h2 className="text-base font-semibold">{section.title}</h2>
            )
          }
          description={`Seção livre · criada pela Farmarcas${section.createdBy ? ` (${section.createdBy})` : ''}`}
          actions={
            canEdit && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    update(index, {
                      ...section,
                      fields: [...section.fields, { label: '', value: '' }],
                    })
                  }
                  className="whitespace-nowrap rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:border-primary hover:text-primary"
                >
                  Adicionar campo
                </button>
                <button
                  type="button"
                  onClick={() => update(index, null)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-destructive-text hover:underline"
                >
                  Remover seção
                </button>
              </div>
            )
          }
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {section.fields.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Nenhum campo ainda</p>
            )}
            {section.fields.map((field, fieldIndex) =>
              canEdit ? (
                <div key={fieldIndex} className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <input
                      aria-label="Nome do campo"
                      placeholder="Nome do campo"
                      value={field.label}
                      onChange={(event) =>
                        updateField(index, section, fieldIndex, { label: event.target.value })
                      }
                      className="min-w-0 flex-1 rounded-sm border border-dashed border-control px-2 py-1 text-xs text-secondary-foreground focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      title="Remover campo"
                      aria-label="Remover campo"
                      onClick={() =>
                        update(index, {
                          ...section,
                          fields: section.fields.filter((_, i) => i !== fieldIndex),
                        })
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                  <input
                    aria-label={field.label || 'Valor do campo'}
                    placeholder="Texto livre"
                    value={field.value}
                    onChange={(event) =>
                      updateField(index, section, fieldIndex, { value: event.target.value })
                    }
                    className={freeInput}
                  />
                </div>
              ) : (
                <FieldView
                  key={fieldIndex}
                  label={field.label || 'Campo sem nome'}
                  value={field.value || null}
                />
              ),
            )}
          </div>
        </SectionCard>
      ))}
      {canCreate && (
        <button
          type="button"
          onClick={() => {
            if (!editor.isEditing) editor.start();
            editor.addFreeSection();
          }}
          className="rounded-lg border border-dashed border-control bg-surface p-[18px] text-center text-sm font-semibold text-primary hover:border-primary"
        >
          <Plus aria-hidden="true" className="mr-1 inline size-4 align-[-3px]" />
          Adicionar seção de informações
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Seção livre com campos de texto · criada pela Farmarcas e visível para o grupo
          </span>
        </button>
      )}
    </>
  );
}
