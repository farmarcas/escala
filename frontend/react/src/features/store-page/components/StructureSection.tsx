import { useState, type ReactNode } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { BasicEditor } from '../hooks/useBasicEditor';
import type { Catalog } from '../hooks/useCatalog';
import type { FreeSection, Selections, StorePage } from '../types';
import { CatalogChecklist } from './CatalogChecklist';
import { FieldView } from './FieldView';
import { HoursGrid } from './HoursGrid';

type StructureSectionProps = { page: StorePage; editor: BasicEditor; catalog: Catalog };

function Block({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-subtle px-5 py-5 last:border-b-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mb-3 text-xs text-muted-foreground">{description}</p>}
      <div className={cn(!description && 'mt-3')}>{children}</div>
    </section>
  );
}

const toNumber = (value: string) =>
  value.trim() === '' ? null : Number(value.replace(/\D/g, '')) || null;

// Estrutura, funcionamento, serviços, sistemas, PBMs e seções livres (spec 002, US5).
export function StructureSection({ page, editor, catalog }: StructureSectionProps) {
  const isEditing = editor.isEditing && page.permissions.canEditBasic;
  const structure = (isEditing && editor.structure) || page.structure;
  const hours = (isEditing && editor.hours) || page.hours;
  const selections: Selections = (isEditing && editor.selections) || page.selections;
  const [openPrograms, setOpenPrograms] = useState<string[]>([]);
  const pbms = catalog.byKind('PBM');
  const programs = [...new Set(pbms.map((item) => item.groupLabel ?? 'Outros'))];
  const pbmTotal = selections.pbms.length;

  return (
    <>
      <Block
        title="Estrutura da loja"
        description="Dados básicos · editados em Editar dados básicos, com histórico"
      >
        {isEditing ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            <SelectField
              label="Prédio próprio"
              placeholder="Não informado"
              options={[
                { value: 'true', label: 'Sim' },
                { value: 'false', label: 'Não' },
              ]}
              value={structure.ownBuilding === null ? '' : String(structure.ownBuilding)}
              onChange={(event) =>
                editor.setStructure({
                  ownBuilding: event.target.value === '' ? null : event.target.value === 'true',
                })
              }
            />
            <TextField
              label="Área da loja (m²)"
              inputMode="numeric"
              value={structure.areaM2 ?? ''}
              onChange={(event) => editor.setStructure({ areaM2: toNumber(event.target.value) })}
            />
            <TextField
              label="Área de venda (m²)"
              inputMode="numeric"
              value={structure.salesAreaM2 ?? ''}
              onChange={(event) =>
                editor.setStructure({ salesAreaM2: toNumber(event.target.value) })
              }
            />
            <TextField
              label="Número de colaboradores"
              inputMode="numeric"
              value={structure.staffCount ?? ''}
              onChange={(event) =>
                editor.setStructure({ staffCount: toNumber(event.target.value) })
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            <FieldView
              label="Prédio próprio"
              value={structure.ownBuilding === null ? null : structure.ownBuilding ? 'Sim' : 'Não'}
              meta={page.fieldMeta.ownBuilding}
            />
            <FieldView
              label="Área da loja (m²)"
              value={structure.areaM2 ? formatNumber(structure.areaM2) : null}
              meta={page.fieldMeta.areaM2}
            />
            <FieldView
              label="Área de venda (m²)"
              value={structure.salesAreaM2 ? formatNumber(structure.salesAreaM2) : null}
              meta={page.fieldMeta.salesAreaM2}
            />
            <FieldView
              label="Número de colaboradores"
              value={structure.staffCount !== null ? formatNumber(structure.staffCount) : null}
              meta={page.fieldMeta.staffCount}
            />
          </div>
        )}
      </Block>

      <Block title="Funcionamento da loja" description="Alimenta o módulo Escala">
        <HoursGrid hours={hours} isEditing={isEditing} onChange={editor.setHours} />
      </Block>

      <Block
        title="Serviços oferecidos na loja"
        description={`${selections.services.length} de ${catalog.byKind('SERVICE').length} serviços`}
      >
        <CatalogChecklist
          label="Serviços oferecidos"
          items={catalog.byKind('SERVICE')}
          selected={selections.services}
          isEditing={isEditing}
          onToggle={(id) => editor.toggleSelection('services', id)}
        />
      </Block>

      <Block title="Sistemas e boas práticas">
        <div className="flex flex-col gap-4">
          {isEditing ? (
            <SelectField
              label="Sistema de demanda da loja"
              placeholder="Não informado"
              options={catalog
                .byKind('DEMAND_SYSTEM')
                .map((item) => ({ value: item.id, label: item.name }))}
              value={structure.demandSystemId ?? ''}
              onChange={(event) =>
                editor.setStructure({ demandSystemId: event.target.value || null })
              }
              className="max-w-sm"
            />
          ) : (
            <FieldView
              label="Sistema de demanda da loja"
              value={catalog.nameOf(structure.demandSystemId)}
              meta={page.fieldMeta.demandSystemId}
              className="max-w-sm"
            />
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-secondary-foreground">
              Ferramentas de boas práticas
            </p>
            <CatalogChecklist
              label="Ferramentas de boas práticas"
              items={catalog.byKind('PRACTICE_TOOL')}
              selected={selections.practiceTools}
              isEditing={isEditing}
              onToggle={(id) => editor.toggleSelection('practiceTools', id)}
            />
          </div>
        </div>
      </Block>

      <Block title="PBMs" description={`${pbmTotal} de ${pbms.length} programas aceitos`}>
        <div className="flex flex-col divide-y divide-subtle rounded-md border border-border">
          {programs.map((program) => {
            const items = pbms.filter((item) => (item.groupLabel ?? 'Outros') === program);
            const chosen = items.filter((item) => selections.pbms.includes(item.id)).length;
            const isOpen = openPrograms.includes(program);
            return (
              <div key={program}>
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
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background"
                >
                  <span className="flex-1 text-sm font-semibold">{program}</span>
                  <span
                    className={cn('text-xs', chosen ? 'text-foreground' : 'text-muted-foreground')}
                  >
                    {chosen} de {items.length} selecionados
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'size-4 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <CatalogChecklist
                      label={`PBMs ${program}`}
                      items={items}
                      selected={selections.pbms}
                      isEditing={isEditing}
                      onToggle={(id) => editor.toggleSelection('pbms', id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Block>

      <FreeSectionsBlock page={page} editor={editor} />
    </>
  );
}

function FreeSectionsBlock({ page, editor }: { page: StorePage; editor: BasicEditor }) {
  const canEdit =
    editor.isEditing && page.permissions.canEditFreeSections && editor.freeSections !== null;
  const sections: FreeSection[] = canEdit ? (editor.freeSections ?? []) : page.freeSections;
  const update = (index: number, next: FreeSection | null) =>
    editor.setFreeSections(
      sections.map((section, i) => (i === index ? next : section)).filter(Boolean) as FreeSection[],
    );

  if (sections.length === 0 && !canEdit) return null;

  return (
    <Block
      title="Seções livres de informações"
      description="Criadas pela Farmarcas e visíveis para o grupo"
    >
      <div className="flex flex-col gap-4">
        {sections.map((section, index) => (
          <div key={section.id ?? `new-${index}`} className="rounded-md border border-border p-4">
            {canEdit ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-end gap-2">
                  <TextField
                    label="Título da seção"
                    value={section.title}
                    onChange={(event) => update(index, { ...section, title: event.target.value })}
                    className="flex-1"
                  />
                  <Button variant="danger-outline" size="sm" onClick={() => update(index, null)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    Remover seção
                  </Button>
                </div>
                {section.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <TextField
                      label="Campo"
                      value={field.label}
                      onChange={(event) =>
                        update(index, {
                          ...section,
                          fields: section.fields.map((item, i) =>
                            i === fieldIndex ? { ...item, label: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <TextField
                      label="Valor"
                      value={field.value}
                      onChange={(event) =>
                        update(index, {
                          ...section,
                          fields: section.fields.map((item, i) =>
                            i === fieldIndex ? { ...item, value: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Remover campo"
                      className="self-end"
                      onClick={() =>
                        update(index, {
                          ...section,
                          fields: section.fields.filter((_, i) => i !== fieldIndex),
                        })
                      }
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="link"
                  size="sm"
                  className="self-start"
                  onClick={() =>
                    update(index, {
                      ...section,
                      fields: [...section.fields, { label: '', value: '' }],
                    })
                  }
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Adicionar campo
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold">{section.title}</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Seção livre · criada pela Farmarcas
                  {section.createdBy ? ` (${section.createdBy})` : ''}
                </p>
                <dl className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                  {section.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex}>
                      <dt className="text-xs text-secondary-foreground">{field.label}</dt>
                      <dd className="text-sm">{field.value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        ))}
        {canEdit && (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() =>
              editor.setFreeSections([
                ...sections,
                { title: 'Nova seção', fields: [{ label: '', value: '' }] },
              ])
            }
          >
            <Plus aria-hidden="true" className="size-4" />
            Adicionar seção de informações
          </Button>
        )}
      </div>
    </Block>
  );
}
