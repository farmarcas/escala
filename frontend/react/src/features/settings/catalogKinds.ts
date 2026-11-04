import type { SelectOption } from '@/components/ui/SelectField';
import { FURNITURE_TYPE_LABEL } from '@/lib/furniture-icons';
import type { CatalogSection, CatalogSlug } from './types';

type TextConfig = { label: string; isRequired?: boolean; hint?: string };

// Campos que cada lista usa (specs/004, data-model "Campos por lista").
export type CatalogListConfig = {
  slug: CatalogSlug;
  section: CatalogSection;
  label: string;
  newLabel: string;
  description: string;
  groupLabel?: TextConfig & { options?: SelectOption[] };
  itemDescription?: TextConfig;
  hasIcon?: boolean;
  hasSelfService?: boolean;
  hasUsedByScale?: boolean;
  hasNegotiated?: boolean;
};

export const CHANNEL_TYPE_LABEL: Record<string, string> = {
  prop: 'Próprio',
  terc: 'De terceiro',
};

const optionsOf = (labels: Record<string, string>): SelectOption[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const CATALOG_LISTS: CatalogListConfig[] = [
  {
    slug: 'furniture',
    section: 'store',
    label: 'Mobiliário',
    newLabel: 'Novo mobiliário',
    description:
      'Itens da aba Mobiliário da loja: o grupo informa quantos tem e quantos ficam para ações de Trade.',
    groupLabel: { label: 'Tipo', isRequired: true, options: optionsOf(FURNITURE_TYPE_LABEL) },
    itemDescription: { label: 'Descrição', hint: 'Aparece abaixo do nome, na loja' },
    hasIcon: true,
    hasSelfService: true,
  },
  {
    slug: 'services',
    section: 'store',
    label: 'Serviços',
    newLabel: 'Novo serviço',
    description: 'Serviços que a loja marca no cartão Serviços da aba Estratégias.',
  },
  {
    slug: 'demand-systems',
    section: 'store',
    label: 'Sistema utilizado',
    newLabel: 'Novo sistema',
    description: 'Sistemas de gestão que a loja escolhe em "Sistema utilizado".',
  },
  {
    slug: 'practice-tools',
    section: 'store',
    label: 'Ferramentas de boas práticas',
    newLabel: 'Nova ferramenta',
    description: 'Ferramentas que a loja marca em "Ferramentas de boas práticas".',
  },
  {
    slug: 'pbms',
    section: 'store',
    label: 'PBMs',
    newLabel: 'Novo PBM',
    description: 'Programas de benefício em medicamentos que a loja aceita.',
    groupLabel: { label: 'Operadora', hint: 'Escolha uma sugestão ou digite uma nova' },
  },
  {
    slug: 'strategies',
    section: 'store',
    label: 'Estratégias comerciais',
    newLabel: 'Nova estratégia',
    description:
      'Estratégias que o grupo marca para a loja. O módulo Escala lê as marcadas como "usada no módulo Escala".',
    itemDescription: { label: 'Descrição' },
    hasUsedByScale: true,
  },
  {
    slug: 'external-tools',
    section: 'store',
    label: 'Ferramentas externas',
    newLabel: 'Nova ferramenta',
    description: 'Ferramentas de mercado que a loja informa se usa e quanto paga por mês.',
    groupLabel: { label: 'Categoria', hint: 'Escolha uma sugestão ou digite uma nova' },
    itemDescription: {
      label: 'Observação da condição',
      hint: 'Ex.: Condição negociada pela Farmarcas',
    },
    hasNegotiated: true,
  },
  {
    slug: 'channels',
    section: 'store',
    label: 'Canais de venda',
    newLabel: 'Novo canal',
    description: 'Canais em que a loja vende e como ela é identificada em cada um.',
    groupLabel: { label: 'Tipo', isRequired: true, options: optionsOf(CHANNEL_TYPE_LABEL) },
    itemDescription: {
      label: 'O que a loja informa',
      isRequired: true,
      hint: 'Ex.: Perfil, Endereço do site, Nome da loja no iFood',
    },
  },
  {
    slug: 'departments',
    section: 'people',
    label: 'Departamentos',
    newLabel: 'Novo departamento',
    description: 'Departamentos da Farmarcas, escolhidos no perfil de cada funcionário.',
  },
  {
    slug: 'occupations',
    section: 'people',
    label: 'Ocupações',
    newLabel: 'Nova ocupação',
    description: 'Ocupações dos funcionários da Farmarcas (ex.: Analista, Coordenador).',
  },
];

export const CATALOG_SECTIONS: { section: CatalogSection; title: string; description: string }[] = [
  {
    section: 'store',
    title: 'Atributos da loja',
    description:
      'As opções que aparecem na página da loja. Mudanças valem na hora para todas as lojas.',
  },
  {
    section: 'people',
    title: 'Pessoas da Farmarcas',
    description: 'Departamentos e ocupações usados no perfil dos funcionários.',
  },
];

// Unidade do "em uso": lojas nas listas da loja, pessoas nas listas de pessoas.
export const inUseText = (list: CatalogListConfig, count: number) =>
  count === 0
    ? list.section === 'people'
      ? 'Ninguém'
      : 'Nenhuma loja'
    : `${count} ${list.section === 'people' ? (count === 1 ? 'pessoa' : 'pessoas') : count === 1 ? 'loja' : 'lojas'}`;

export const listOf = (slug: string | undefined): CatalogListConfig | undefined =>
  CATALOG_LISTS.find((list) => list.slug === slug);

// Texto do agrupador na tabela (tipo de mobiliário e de canal têm rótulo; os outros, o valor).
export function groupLabelText(list: CatalogListConfig, value: string | null): string {
  if (!value) return '—';
  if (list.slug === 'furniture') return FURNITURE_TYPE_LABEL[value] ?? value;
  if (list.slug === 'channels') return CHANNEL_TYPE_LABEL[value] ?? value;
  return value;
}
