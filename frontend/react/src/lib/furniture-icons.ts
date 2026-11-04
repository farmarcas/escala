import {
  Archive,
  Armchair,
  Baby,
  Bell,
  Box,
  Boxes,
  Calculator,
  Candy,
  ClipboardList,
  Columns3,
  CreditCard,
  CupSoda,
  DoorOpen,
  Glasses,
  HeartPulse,
  Image as ImageIcon,
  LayoutGrid,
  Layers,
  LibraryBig,
  Lightbulb,
  Megaphone,
  Monitor,
  Package,
  Pill,
  Printer,
  Refrigerator,
  Rows3,
  Scale,
  ScanBarcode,
  ShoppingBasket,
  ShoppingCart,
  Signpost,
  Snowflake,
  Sofa,
  Sparkles,
  Speaker,
  Stethoscope,
  Store,
  Syringe,
  Tablet,
  Tag,
  TestTube,
  Thermometer,
  Tv,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

export type FurnitureIcon = {
  key: string;
  icon: LucideIcon;
  label: string;
  group: string;
  keywords: string;
};

// Galeria do mobiliário (specs/004, FR-021). A chave é o que o banco guarda; a lista de chaves
// é a mesma de backend/node/src/modules/settings-catalog/furniture-icons.ts (teste confere).
export const FURNITURE_ICON_GROUPS = [
  'Expositores e gôndolas',
  'Caixa e check-out',
  'Refrigeração',
  'Balcão e atendimento',
  'Salas',
  'Telas e sinalização',
  'Outros',
] as const;

const [SHELVES, CHECKOUT, COLD, COUNTER, ROOMS, SCREENS, OTHER] = FURNITURE_ICON_GROUPS;

export const FURNITURE_ICONS: FurnitureIcon[] = [
  {
    key: 'shelving',
    icon: LibraryBig,
    label: 'Gôndola',
    group: SHELVES,
    keywords: 'prateleira estante corredor',
  },
  {
    key: 'shelf-end',
    icon: Columns3,
    label: 'Ponta de gôndola',
    group: SHELVES,
    keywords: 'cabeceira destaque',
  },
  {
    key: 'display-stand',
    icon: LayoutGrid,
    label: 'Expositor',
    group: SHELVES,
    keywords: 'display vitrine',
  },
  {
    key: 'island',
    icon: Boxes,
    label: 'Ilha promocional',
    group: SHELVES,
    keywords: 'ponto extra campanha pallet',
  },
  {
    key: 'tower',
    icon: Layers,
    label: 'Torre de marca',
    group: SHELVES,
    keywords: 'expositor vertical',
  },
  { key: 'rack', icon: Rows3, label: 'Estante', group: SHELVES, keywords: 'prateleira rack' },
  {
    key: 'basket',
    icon: ShoppingBasket,
    label: 'Cesto',
    group: SHELVES,
    keywords: 'cesta promocao',
  },
  {
    key: 'scan-barcode',
    icon: ScanBarcode,
    label: 'Check-out',
    group: CHECKOUT,
    keywords: 'caixa pdv leitor codigo de barras',
  },
  {
    key: 'cash-register',
    icon: Calculator,
    label: 'Caixa',
    group: CHECKOUT,
    keywords: 'pdv registradora',
  },
  {
    key: 'card-machine',
    icon: CreditCard,
    label: 'Maquininha',
    group: CHECKOUT,
    keywords: 'cartao pagamento pos',
  },
  { key: 'printer', icon: Printer, label: 'Impressora', group: CHECKOUT, keywords: 'cupom fiscal' },
  {
    key: 'impulse',
    icon: Candy,
    label: 'Display de impulso',
    group: CHECKOUT,
    keywords: 'caixa bala chiclete',
  },
  {
    key: 'shopping-cart',
    icon: ShoppingCart,
    label: 'Carrinho',
    group: CHECKOUT,
    keywords: 'compras',
  },
  {
    key: 'refrigerator',
    icon: Refrigerator,
    label: 'Geladeira',
    group: COLD,
    keywords: 'refrigerador termolabil frio',
  },
  {
    key: 'freezer',
    icon: Snowflake,
    label: 'Freezer',
    group: COLD,
    keywords: 'congelador frio gelo',
  },
  {
    key: 'thermometer',
    icon: Thermometer,
    label: 'Termolábeis',
    group: COLD,
    keywords: 'temperatura frio vacina',
  },
  {
    key: 'cooler-drink',
    icon: CupSoda,
    label: 'Vitrine de bebidas',
    group: COLD,
    keywords: 'geladeira bebida refrigerante conveniencia',
  },
  {
    key: 'counter',
    icon: Store,
    label: 'Balcão',
    group: COUNTER,
    keywords: 'atendimento farmaceutico',
  },
  {
    key: 'pill',
    icon: Pill,
    label: 'Medicamentos',
    group: COUNTER,
    keywords: 'remedio comprimido',
  },
  {
    key: 'prescription',
    icon: ClipboardList,
    label: 'Receituário',
    group: COUNTER,
    keywords: 'receita prescricao',
  },
  {
    key: 'armchair',
    icon: Armchair,
    label: 'Cadeira de espera',
    group: COUNTER,
    keywords: 'assento poltrona',
  },
  { key: 'sofa', icon: Sofa, label: 'Área de espera', group: COUNTER, keywords: 'sofa banco' },
  {
    key: 'bell',
    icon: Bell,
    label: 'Senha de atendimento',
    group: COUNTER,
    keywords: 'chamada fila campainha',
  },
  { key: 'door-open', icon: DoorOpen, label: 'Sala', group: ROOMS, keywords: 'porta ambiente' },
  {
    key: 'stethoscope',
    icon: Stethoscope,
    label: 'Serviços farmacêuticos',
    group: ROOMS,
    keywords: 'consulta cuidado afericao',
  },
  {
    key: 'syringe',
    icon: Syringe,
    label: 'Aplicação',
    group: ROOMS,
    keywords: 'injecao vacina seringa',
  },
  {
    key: 'heart-pulse',
    icon: HeartPulse,
    label: 'Aferição',
    group: ROOMS,
    keywords: 'pressao glicemia saude',
  },
  { key: 'scale', icon: Scale, label: 'Balança', group: ROOMS, keywords: 'peso' },
  {
    key: 'test-tube',
    icon: TestTube,
    label: 'Manipulação',
    group: ROOMS,
    keywords: 'laboratorio formula',
  },
  {
    key: 'monitor',
    icon: Monitor,
    label: 'Totem digital',
    group: SCREENS,
    keywords: 'tela midia campanha',
  },
  { key: 'tv', icon: Tv, label: 'TV', group: SCREENS, keywords: 'televisao tela midia' },
  { key: 'tablet', icon: Tablet, label: 'Tablet', group: SCREENS, keywords: 'tela consulta' },
  {
    key: 'megaphone',
    icon: Megaphone,
    label: 'Campanha',
    group: SCREENS,
    keywords: 'promocao anuncio',
  },
  {
    key: 'signpost',
    icon: Signpost,
    label: 'Sinalização',
    group: SCREENS,
    keywords: 'placa indicacao',
  },
  {
    key: 'price-tag',
    icon: Tag,
    label: 'Etiqueta de preço',
    group: SCREENS,
    keywords: 'preco precificacao',
  },
  {
    key: 'banner',
    icon: ImageIcon,
    label: 'Banner',
    group: SCREENS,
    keywords: 'cartaz adesivo imagem',
  },
  {
    key: 'lightbulb',
    icon: Lightbulb,
    label: 'Iluminação',
    group: SCREENS,
    keywords: 'luz lampada',
  },
  {
    key: 'speaker',
    icon: Speaker,
    label: 'Som',
    group: SCREENS,
    keywords: 'radio caixa de som audio',
  },
  {
    key: 'package',
    icon: Package,
    label: 'Mobiliário',
    group: OTHER,
    keywords: 'padrao generico movel',
  },
  { key: 'box', icon: Box, label: 'Caixa organizadora', group: OTHER, keywords: 'caixa' },
  { key: 'archive', icon: Archive, label: 'Arquivo', group: OTHER, keywords: 'gaveta documentos' },
  {
    key: 'warehouse',
    icon: Warehouse,
    label: 'Estoque',
    group: OTHER,
    keywords: 'deposito armazem',
  },
  {
    key: 'sparkles',
    icon: Sparkles,
    label: 'Dermocosméticos',
    group: OTHER,
    keywords: 'beleza cosmetico pele',
  },
  { key: 'baby', icon: Baby, label: 'Infantil', group: OTHER, keywords: 'bebe crianca fralda' },
  {
    key: 'glasses',
    icon: Glasses,
    label: 'Óculos',
    group: OTHER,
    keywords: 'otica oculos de leitura',
  },
];

export const DEFAULT_FURNITURE_ICON = 'package';

// Chave desconhecida ou vazia mostra o ícone padrão: nenhum item fica sem imagem.
export function furnitureIcon(key: string | null | undefined): FurnitureIcon {
  return (
    FURNITURE_ICONS.find((item) => item.key === key) ??
    FURNITURE_ICONS.find((item) => item.key === DEFAULT_FURNITURE_ICON)!
  );
}

const plain = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

// Busca por palavra, sem diferença de acento ou maiúscula, no nome, grupo e palavras-chave.
export function searchIcons(term: string): FurnitureIcon[] {
  const words = plain(term).split(/\s+/).filter(Boolean);
  if (words.length === 0) return FURNITURE_ICONS;
  return FURNITURE_ICONS.filter((item) => {
    const text = plain(`${item.label} ${item.group} ${item.keywords}`);
    return words.every((word) => text.includes(word));
  });
}

// Tipos de mobiliário (o código fica no banco; o rótulo, aqui).
export const FURNITURE_TYPE_LABEL: Record<string, string> = {
  gondola: 'Gôndola',
  checkout: 'Check-out',
  balcao: 'Balcão',
  frio: 'Refrigeração',
  expositor: 'Expositor',
  sala: 'Sala',
  outro: 'Outro',
};

export const defaultSelfService = (type: string) => type === 'gondola' || type === 'expositor';
