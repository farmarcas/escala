// Texto do histórico das configurações: "Lista · Item: Campo: antes → depois; ...".
type Snapshot = {
  name: string;
  groupLabel: string | null;
  description: string | null;
  icon: string | null;
  selfService: boolean;
  usedByScale: boolean;
  negotiatedMonthlyCents: number | null;
};

const FIELD_LABEL: Record<keyof Snapshot, string> = {
  name: 'Nome',
  groupLabel: 'Agrupador',
  description: 'Descrição',
  icon: 'Ícone',
  selfService: 'Autosserviço',
  usedByScale: 'Usada no módulo Escala',
  negotiatedMonthlyCents: 'Valor negociado',
};

// O agrupador muda de nome conforme a lista.
const GROUP_LABEL_BY_LIST: Record<string, string> = {
  Mobiliário: 'Tipo',
  PBMs: 'Operadora',
  'Ferramentas externas': 'Categoria',
  'Canais de venda': 'Tipo',
};

const DESCRIPTION_BY_LIST: Record<string, string> = {
  'Ferramentas externas': 'Observação',
  'Canais de venda': 'O que a loja informa',
};

const show = (key: keyof Snapshot, value: Snapshot[keyof Snapshot]): string => {
  if (value === null || value === '') return '(vazio)';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (key === 'negotiatedMonthlyCents' && typeof value === 'number')
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return String(value);
};

export const changesText = (list: string, before: Snapshot, after: Snapshot): string | null => {
  const parts = (Object.keys(FIELD_LABEL) as (keyof Snapshot)[])
    .filter((key) => before[key] !== after[key])
    .map((key) => {
      const label =
        (key === 'groupLabel' && GROUP_LABEL_BY_LIST[list]) ||
        (key === 'description' && DESCRIPTION_BY_LIST[list]) ||
        FIELD_LABEL[key];
      return `${label}: ${show(key, before[key])} → ${show(key, after[key])}`;
    });
  return parts.length === 0 ? null : `${list} · ${before.name}: ${parts.join('; ')}`;
};
