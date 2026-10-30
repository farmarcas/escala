import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { GroupStatus } from './types';

export const GROUP_STATUS: Record<GroupStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  SUSPENDED: { label: 'Suspenso', tone: 'danger' },
  ARCHIVED: { label: 'Arquivado', tone: 'neutral' },
};
