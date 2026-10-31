// Só para testes de integração: conexão com o DONO do banco de teste (sem RLS), usada para
// preparar e limpar dados. A aplicação nunca usa esta conexão.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { PlatformIdentity } from '../shared/identity/identity.js';

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error('MIGRATION_DATABASE_URL não definido para os testes de integração');

export const ownerDb = new PrismaClient({ adapter: new PrismaPg(url) });

export const ADMIN_HEADERS = { 'x-demo-role': 'admin' } as const;
export const ownerHeaders = (groupId: string) => ({
  'x-demo-role': 'owner',
  'x-demo-tenant': groupId,
});
export const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');
export const ANALYST_HEADERS = { 'x-demo-role': 'analyst' } as const;
export const admin: PlatformIdentity = {
  kind: 'platform',
  subject: 'OP-02',
  role: 'PLATFORM_ADMIN',
};

export const resetBackoffice = async () => {
  await ownerDb.$executeRawUnsafe(
    `TRUNCATE store_custom_entries, store_free_fields, store_free_sections, store_catalog_entries, store_opening_hours,
              store_document_files, store_documents, store_change_request_events, store_change_requests,
              store_history, audit_events, stores, group_owners, economic_groups, brands, catalog_items,
              farmarcas_employees, partner_contacts, partners
     RESTART IDENTITY CASCADE`,
  );
};

// CNPJ válido a partir de 12 dígitos (raiz + filial).
export const makeCnpj = (base12: string): string => {
  const digits = [...base12].map(Number);
  const weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const check = (values: number[], w: number[]) => {
    const rest = w.reduce((sum, weight, index) => sum + weight * (values[index] ?? 0), 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  digits.push(check(digits, weights));
  digits.push(check(digits, [6, ...weights]));
  return digits.join('');
};

export const createBrand = (name: string, status: 'ACTIVE' | 'HISTORICAL' = 'ACTIVE') =>
  ownerDb.brand.create({ data: { name, normalizedName: name.toLowerCase(), status } });

export const createGroup = async (
  number: number,
  name: string,
  options: { status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'; owner?: boolean } = {},
) => {
  const group = await ownerDb.economicGroup.create({
    data: {
      number,
      name,
      legalName: `${name} Ltda`,
      cnpj: makeCnpj(`${String(number).padStart(8, '0')}0001`),
      status: options.status ?? 'ACTIVE',
    },
  });
  if (options.owner !== false) {
    await ownerDb.groupOwner.create({
      data: {
        economicGroupId: group.id,
        name: `Dona ${name}`,
        email: `dona${number}@exemplo.com.br`,
        phone: '11900000000',
        pseudonym: `F-${String(number).padStart(5, '0')}`,
      },
    });
  }
  await ownerDb.$executeRawUnsafe(
    "SELECT setval(pg_get_serial_sequence('economic_groups', 'number'), (SELECT max(number) FROM economic_groups))",
  );
  return group;
};

export const createStore = async (
  groupId: string,
  brandId: string,
  code: number,
  overrides: Partial<{ type: 'PDV' | 'CD'; uf: string; city: string; name: string }> = {},
) => {
  const store = await ownerDb.store.create({
    data: {
      code,
      economicGroupId: groupId,
      brandId,
      name: overrides.name ?? `Loja ${code}`,
      type: overrides.type ?? 'PDV',
      cnpj: makeCnpj(`9${String(code).padStart(7, '0')}0001`),
      street: 'Rua Teste',
      number: '1',
      district: 'Centro',
      city: overrides.city ?? 'São Paulo',
      uf: overrides.uf ?? 'SP',
      status: 'ACTIVE',
    },
  });
  await ownerDb.$executeRawUnsafe(
    "SELECT setval(pg_get_serial_sequence('stores', 'code'), (SELECT max(code) FROM stores))",
  );
  return store;
};

export const createCatalogItem = (
  kind:
    | 'SERVICE'
    | 'DEMAND_SYSTEM'
    | 'PRACTICE_TOOL'
    | 'PBM'
    | 'STRATEGY'
    | 'FURNITURE'
    | 'EXTERNAL_TOOL'
    | 'CHANNEL',
  name: string,
  extra: { negotiatedMonthlyCents?: number; groupLabel?: string } = {},
) => ownerDb.catalogItem.create({ data: { kind, name, ...extra } });

export const createEmployee = (
  name: string,
  options: { status?: 'ACTIVE' | 'TERMINATED'; email?: string } = {},
) =>
  ownerDb.farmarcasEmployee.create({
    data: {
      name,
      email: options.email ?? `${name.toLowerCase().replace(/\s+/g, '.')}@farmarcas.com.br`,
      area: 'MEMBER_SUCCESS',
      jobTitle: 'Analista de relacionamento',
      accessRole: 'PLATFORM_ANALYST',
      status: options.status ?? 'ACTIVE',
      terminatedAt: options.status === 'TERMINATED' ? new Date() : null,
    },
  });
