import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { PartnerStatus, PartnerType } from './types';

export const TYPE_LABEL: Record<PartnerType, string> = {
  INDUSTRY: 'Indústria',
  DISTRIBUTOR: 'Distribuidor',
};

export const TYPE_TONE: Record<PartnerType, BadgeTone> = { INDUSTRY: 'brand', DISTRIBUTOR: 'info' };

export const PARTNER_STATUS: Record<PartnerStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  INACTIVE: { label: 'Inativo', tone: 'neutral' },
};

export const TYPE_OPTIONS = (Object.keys(TYPE_LABEL) as PartnerType[]).map((value) => ({
  value,
  label: TYPE_LABEL[value],
}));
