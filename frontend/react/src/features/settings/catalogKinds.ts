import type { SelectOption } from '@/components/ui/SelectField';
import { FURNITURE_TYPE_LABEL } from '@/lib/furniture-icons';
import type { CatalogSlug } from './types';

type TextConfig = { label: string; isRequired?: boolean; hint?: string };

// Campos que cada lista usa (specs/004, data-model "Campos por lista").
export type CatalogListConfig = {
  slug: CatalogSlug;
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
    label: 'Serviços',
    newLabel: 'Novo serviço',
    description: 'Serviços que a loja marca no cartão Serviços da aba Estratégias.',
  },
  {
    slug: 'demand-systems',
    label: 'Sistema utilizado',
    newLabel: 'Novo sistema',
    description: 'Sistemas de gestão que a loja escolhe em "Sistema utilizado".',
  },
  {
    slug: 'practice-tools',
    label: 'Ferramentas de boas práticas',
    newLabel: 'Nova ferramenta',
    description: 'Ferramentas que a loja marca em "Ferramentas de boas práticas".',
  },
  {
    slug: 'pbms',
    label: 'PBMs',
    newLabel: 'Novo PBM',
    description: 'Programas de benefício em medicamentos que a loja aceita.',
    groupLabel: { label: 'Operadora', hint: 'Escolha uma sugestão ou digite uma nova' },
  },
  {
    slug: 'strategies',
    label: 'Estratégias comerciais',
    newLabel: 'Nova estratégia',
    description:
      'Estratégias que o grupo marca para a loja. O módulo Escala lê as marcadas como "usada no módulo Escala".',
    itemDescription: { label: 'Descrição' },
    hasUsedByScale: true,
  },
  {
    slug: 'external-tools',
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
];

export const listOf = (slug: string | undefined): CatalogListConfig | undefined =>
  CATALOG_LISTS.find((list) => list.slug === slug);

// Texto do agrupador na tabela (tipo de mobiliário e de canal têm rótulo; os outros, o valor).
export function groupLabelText(list: CatalogListConfig, value: string | null): string {
  if (!value) return '—';
  if (list.slug === 'furniture') return FURNITURE_TYPE_LABEL[value] ?? value;
  if (list.slug === 'channels') return CHANNEL_TYPE_LABEL[value] ?? value;
  return value;
}
