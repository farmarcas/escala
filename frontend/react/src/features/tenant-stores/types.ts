import type { ValidationStatus } from '@/lib/governance';

export type TenantStore = {
  id: string;
  code: number;
  name: string;
  type: 'PDV' | 'CD';
  city: string;
  uf: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  // Loja bloqueada pela Farmarcas: aparece na lista, mas não abre.
  isBlocked: boolean;
  brand: { name: string };
  completeness: { filled: number; total: number };
  validation: { status: ValidationStatus; validatedAt: string | null; days: number | null };
  docAlerts: number;
  openRequests: number;
};
