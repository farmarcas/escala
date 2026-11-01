import { useState } from 'react';
import { fieldErrors, toApiError, type ApiError } from '@/lib/api';
import { formatPhone, formatZip, onlyDigits } from '@/lib/format';
import { BASIC_FIELD_UI } from '../labels';
import type {
  BasicKey,
  FreeSection,
  OpeningHour,
  Selections,
  StorePage,
  Structure,
} from '../types';

type Draft = Record<BasicKey, string>;

// Valor como a pessoa vê e digita (com máscara); a API recebe só os dígitos.
function toInput(key: BasicKey, value: string | null): string {
  if (!value) return '';
  const kind = BASIC_FIELD_UI[key].kind;
  if (kind === 'phone') return formatPhone(value);
  if (kind === 'zip') return formatZip(value);
  return value;
}

function toApi(key: BasicKey, value: string): string | null {
  const kind = BASIC_FIELD_UI[key].kind;
  const clean = kind === 'phone' || kind === 'zip' ? onlyDigits(value) : value.trim();
  return clean === '' ? null : clean;
}

function sectionsOf(page: StorePage): FreeSection[] {
  return page.freeSections.map((section) => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map((field) => ({ label: field.label, value: field.value })),
  }));
}

function draftOf(page: StorePage): Draft {
  return Object.fromEntries(
    (Object.keys(BASIC_FIELD_UI) as BasicKey[]).map((key) => [key, toInput(key, page.basic[key])]),
  ) as Draft;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (ids: string[]) => [...ids].sort();

// Estado da edição dos dados básicos e da estrutura (horário, catálogos, seções livres,
// estratégias):
// rascunho, motivo (Farmarcas), alterações e erros.
export function useBasicEditor(page: StorePage | undefined) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [structure, setStructure] = useState<Structure | null>(null);
  const [hours, setHours] = useState<OpeningHour[] | null>(null);
  const [selections, setSelections] = useState<Selections | null>(null);
  const [freeSections, setFreeSections] = useState<FreeSection[] | null>(null);
  const [strategies, setStrategies] = useState<string[] | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = draft !== null;
  const editable = (key: BasicKey) =>
    Boolean(page?.permissions.canEditBasic) &&
    (!BASIC_FIELD_UI[key].isOwnerPrivate || Boolean(page?.permissions.canEditOwnerPrivate));

  const changes = (): Record<string, string | null> => {
    if (!draft || !page) return {};
    const result: Record<string, string | null> = {};
    for (const key of Object.keys(draft) as BasicKey[]) {
      if (!editable(key)) continue;
      const next = toApi(key, draft[key]);
      if (next !== (page.basic[key] ?? null)) result[key] = next;
    }
    return result;
  };

  // Partes da estrutura que mudaram (só elas vão para a API).
  const structureChanges = () => {
    if (!page) return {};
    const result: Record<string, unknown> = {};
    if (structure && !same(structure, page.structure)) {
      result.structure = Object.fromEntries(
        Object.entries(structure).filter(
          ([key, value]) => !same(value, page.structure[key as keyof Structure]),
        ),
      );
    }
    if (hours && !same(hours, page.hours)) result.hours = hours;
    if (selections) {
      const changed = (Object.keys(selections) as (keyof Selections)[]).filter(
        (key) => !same(sorted(selections[key]), sorted(page.selections[key])),
      );
      if (changed.length > 0)
        result.selections = Object.fromEntries(changed.map((key) => [key, selections[key]]));
    }
    if (
      freeSections &&
      page.permissions.canEditFreeSections &&
      !same(freeSections, sectionsOf(page))
    ) {
      result.freeSections = freeSections;
    }
    return result;
  };

  const structureCount = (() => {
    const result = structureChanges() as {
      structure?: object;
      hours?: unknown;
      selections?: object;
      freeSections?: unknown;
    };
    return (
      Object.keys(result.structure ?? {}).length +
      (result.hours ? 1 : 0) +
      Object.keys(result.selections ?? {}).length +
      (result.freeSections ? 1 : 0)
    );
  })();
  // Estratégias vão por rota própria; só o grupo altera.
  const strategiesChanged =
    strategies !== null &&
    Boolean(page?.permissions.canEditStrategies) &&
    !same(sorted(strategies), sorted(page?.strategies.map((item) => item.itemId) ?? []));
  const changeCount = Object.keys(changes()).length + structureCount + (strategiesChanged ? 1 : 0);
  const needsReason = Boolean(page?.permissions.requiresReason);
  const canSave = changeCount > 0 && (!needsReason || reason.trim().length > 0) && !isSaving;

  return {
    isEditing,
    draft,
    reason,
    setReason,
    changeCount,
    needsReason,
    canSave,
    isSaving,
    error,
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors(error)).map(([path, message]) => [
        path.replace(/^basic\./, ''),
        message,
      ]),
    ) as Partial<Record<BasicKey, string>>,
    editable,
    structure,
    hours,
    selections,
    freeSections,
    setStructure: (patch: Partial<Structure>) =>
      setStructure((current) => (current ? { ...current, ...patch } : current)),
    setHours,
    toggleSelection: (key: keyof Selections, id: string) =>
      setSelections((current) =>
        current
          ? {
              ...current,
              [key]: current[key].includes(id)
                ? current[key].filter((item) => item !== id)
                : [...current[key], id],
            }
          : current,
      ),
    setFreeSections,
    // Seção livre nova no fim; serve também logo depois de start() (mesmo clique).
    addFreeSection: () =>
      setFreeSections((current) => [
        ...(current ?? (page ? sectionsOf(page) : [])),
        { title: 'Nova seção', fields: [{ label: '', value: '' }] },
      ]),
    strategies,
    toggleStrategy: (id: string) =>
      setStrategies((current) =>
        current
          ? current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id]
          : current,
      ),
    start: () => {
      if (!page) return;
      setDraft(draftOf(page));
      setStructure({ ...page.structure });
      setHours(page.hours.map((hour) => ({ ...hour })));
      setSelections({ ...page.selections });
      setFreeSections(sectionsOf(page));
      setStrategies(page.strategies.map((item) => item.itemId));
      setReason('');
      setError(null);
    },
    cancel: () => {
      setDraft(null);
      setStructure(null);
      setHours(null);
      setSelections(null);
      setFreeSections(null);
      setStrategies(null);
      setError(null);
    },
    setField: (key: BasicKey, raw: string) => {
      const kind = BASIC_FIELD_UI[key].kind;
      const value = kind === 'phone' ? formatPhone(raw) : kind === 'zip' ? formatZip(raw) : raw;
      setDraft((current) => (current ? { ...current, [key]: value } : current));
    },
    // Envia dados básicos e estrutura juntos, depois as estratégias; só o que mudou.
    save: async (
      persist: (
        changes: Record<string, unknown>,
        version: number,
        reason?: string,
      ) => Promise<void>,
      persistStrategies: (itemIds: string[]) => Promise<void>,
    ) => {
      if (!page || !canSave) return;
      setIsSaving(true);
      setError(null);
      try {
        const basic = changes();
        if (Object.keys(basic).length > 0 || structureCount > 0) {
          await persist(
            { basic, ...structureChanges() },
            page.version,
            needsReason ? reason.trim() : undefined,
          );
        }
        if (strategiesChanged && strategies) await persistStrategies(strategies);
        setDraft(null);
        setStructure(null);
        setHours(null);
        setSelections(null);
        setFreeSections(null);
        setStrategies(null);
      } catch (caught) {
        setError(toApiError(caught));
      } finally {
        setIsSaving(false);
      }
    },
  };
}

export type BasicEditor = ReturnType<typeof useBasicEditor>;
