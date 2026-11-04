import { describe, expect, it } from 'vitest';
import { defaultSelfService } from './catalog-kinds.js';
import { createSchemaFor, updateSchemaFor } from './settings-catalog.schemas.js';

describe('esquema por lista', () => {
  it('mobiliário exige tipo e ícone da galeria', () => {
    const schema = createSchemaFor('furniture');
    expect(
      schema.safeParse({ name: 'Expositor de vitaminas', groupLabel: 'expositor', icon: 'tower' })
        .success,
    ).toBe(true);
    expect(schema.safeParse({ name: 'X', groupLabel: 'expositor' }).success).toBe(false);
    expect(schema.safeParse({ name: 'X', groupLabel: 'expositor', icon: 'rocket' }).success).toBe(
      false,
    );
    expect(schema.safeParse({ name: 'X', groupLabel: 'mesa', icon: 'tower' }).success).toBe(false);
  });

  it('recusa campo de outra lista', () => {
    expect(createSchemaFor('services').safeParse({ name: 'Vacinação', icon: 'pill' }).success).toBe(
      false,
    );
    expect(createSchemaFor('pbms').safeParse({ name: 'Novo', usedByScale: true }).success).toBe(
      false,
    );
  });

  it('nome tem de 1 a 80 caracteres e perde os espaços das pontas', () => {
    const schema = createSchemaFor('services');
    expect(schema.parse({ name: '  Vacinação  ' })).toEqual({ name: 'Vacinação' });
    expect(schema.safeParse({ name: '   ' }).success).toBe(false);
    expect(schema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false);
  });

  it('canal exige tipo e o que a loja informa', () => {
    const schema = createSchemaFor('channels');
    expect(
      schema.safeParse({ name: 'TikTok', groupLabel: 'terc', description: 'Perfil' }).success,
    ).toBe(true);
    expect(schema.safeParse({ name: 'TikTok', groupLabel: 'terc' }).success).toBe(false);
  });

  it('valor negociado não pode ser negativo; vazio vira nulo', () => {
    const schema = createSchemaFor('external-tools');
    expect(schema.safeParse({ name: 'X', negotiatedMonthlyCents: -1 }).success).toBe(false);
    expect(schema.parse({ name: 'X', groupLabel: '', negotiatedMonthlyCents: null })).toEqual({
      name: 'X',
      groupLabel: null,
      negotiatedMonthlyCents: null,
    });
  });

  it('alteração aceita só parte dos campos, mas ao menos um', () => {
    expect(updateSchemaFor('strategies').safeParse({ usedByScale: true }).success).toBe(true);
    expect(updateSchemaFor('strategies').safeParse({}).success).toBe(false);
  });
});

describe('defaultSelfService', () => {
  it('gôndola e expositor contam como autosserviço', () => {
    expect(defaultSelfService('gondola')).toBe(true);
    expect(defaultSelfService('expositor')).toBe(true);
    expect(defaultSelfService('frio')).toBe(false);
  });
});
