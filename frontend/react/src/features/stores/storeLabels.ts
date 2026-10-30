import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { StoreStatus, StoreType } from './types';

export const STORE_STATUS: Record<StoreStatus, { label: string; tone: BadgeTone; title?: string }> =
  {
    ACTIVE: { label: 'Ativa', tone: 'success' },
    INACTIVE: { label: 'Inativa', tone: 'neutral' },
    PENDING: {
      label: 'Pendente no grupo',
      tone: 'warning',
      title: 'Aguardando o grupo verificar a loja e completar os dados estratégicos',
    },
  };

export const STORE_TYPE: Record<StoreType, { label: string; tone: BadgeTone; title: string }> = {
  PDV: { label: 'PDV', tone: 'neutral', title: 'Ponto de venda' },
  CD: { label: 'CD', tone: 'info', title: 'Centro de distribuição' },
};
