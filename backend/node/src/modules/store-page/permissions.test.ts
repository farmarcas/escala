import { describe, expect, it } from 'vitest';
import { ownsStep, permissionsOf, viewerOf } from './permissions.js';

const admin = viewerOf({ kind: 'platform', subject: 'OP-02', role: 'PLATFORM_ADMIN' }, 'ACTIVE');
const analyst = viewerOf(
  { kind: 'platform', subject: 'OP-07', role: 'PLATFORM_ANALYST' },
  'ACTIVE',
);
const owner = viewerOf(
  { kind: 'tenant', subject: 'F-1A0PR', role: 'TENANT_ADMIN', tenantId: 'g1' },
  'ACTIVE',
);
const suspendedOwner = viewerOf(
  { kind: 'tenant', subject: 'F-1A0PR', role: 'TENANT_ADMIN', tenantId: 'g1' },
  'SUSPENDED',
);

describe('permissionsOf', () => {
  it('Farmarcas edita dados básicos com motivo e não mexe em dado pessoal do proprietário', () => {
    expect(permissionsOf(admin)).toMatchObject({
      canEditBasic: true,
      requiresReason: true,
      canEditOwnerPrivate: false,
      canSeeOwnerPrivate: true,
      canValidate: false,
      canRemind: true,
    });
  });

  it('analista só lê e não vê dado pessoal', () => {
    expect(permissionsOf(analyst)).toMatchObject({
      canEditBasic: false,
      canOpenRequest: false,
      canSeeOwnerPrivate: false,
      uploadableDocuments: [],
    });
  });

  it('grupo edita sem motivo, edita dado pessoal e valida', () => {
    expect(permissionsOf(owner)).toMatchObject({
      canEditBasic: true,
      requiresReason: false,
      canEditOwnerPrivate: true,
      canValidate: true,
      canRemind: false,
    });
    expect(permissionsOf(owner).uploadableDocuments).toContain('SANITARY_LICENSE');
    expect(permissionsOf(owner).uploadableDocuments).not.toContain('CNPJ_CARD');
  });

  it('grupo suspenso fica só leitura', () => {
    expect(permissionsOf(suspendedOwner).canEditBasic).toBe(false);
    expect(permissionsOf(suspendedOwner).canOpenRequest).toBe(false);
  });
});

describe('ownsStep', () => {
  it('cada lado age só nas próprias etapas; etapa do sistema é da Farmarcas', () => {
    expect(ownsStep(owner, 'group')).toBe(true);
    expect(ownsStep(owner, 'platform')).toBe(false);
    expect(ownsStep(admin, 'platform')).toBe(true);
    expect(ownsStep(admin, 'system')).toBe(true);
    expect(ownsStep(admin, 'group')).toBe(false);
    expect(ownsStep(analyst, 'platform')).toBe(false);
  });
});
