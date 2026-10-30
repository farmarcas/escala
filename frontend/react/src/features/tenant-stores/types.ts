import type { ValidationStatus } from '@/lib/governance';

export type TenantStore = {
  id: string;
  code: number;
  name: string;
  type: 'PDV' | 'CD';
  city: string;
  uf: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  brand: { name: string };
  completeness: { filled: number; total: number };
  validation: { status: ValidationStatus; validatedAt: string | null; days: number | null };
  docAlerts: number;
  openRequests: number;
};
