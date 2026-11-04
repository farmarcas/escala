// Chaves da galeria de ícones do mobiliário. A tela tem a mesma lista com o desenho de cada uma
// (frontend/react/src/lib/furniture-icons.ts); um teste da tela confere que as duas batem.
export const FURNITURE_ICON_KEYS = [
  // Expositores e gôndolas
  'shelving',
  'shelf-end',
  'display-stand',
  'island',
  'tower',
  'rack',
  'basket',
  // Caixa e check-out
  'scan-barcode',
  'cash-register',
  'card-machine',
  'printer',
  'impulse',
  'shopping-cart',
  // Refrigeração
  'refrigerator',
  'freezer',
  'thermometer',
  'cooler-drink',
  // Balcão e atendimento
  'counter',
  'pill',
  'prescription',
  'armchair',
  'sofa',
  'bell',
  // Salas
  'door-open',
  'stethoscope',
  'syringe',
  'heart-pulse',
  'scale',
  'test-tube',
  // Telas e sinalização
  'monitor',
  'tv',
  'tablet',
  'megaphone',
  'signpost',
  'price-tag',
  'banner',
  'lightbulb',
  'speaker',
  // Outros
  'package',
  'box',
  'archive',
  'warehouse',
  'sparkles',
  'baby',
  'glasses',
] as const;

export const DEFAULT_FURNITURE_ICON = 'package';
