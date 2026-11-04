import { describe, expect, it } from 'vitest';
import {
  createEmployeeSchema,
  listEmployeesQuery,
  updateEmployeeSchema,
} from './employees.schemas.js';

const valid = {
  name: 'Adriana Oliveira',
  email: 'Adriana.Oliveira@farmarcas.com.br',
  mobile: '(11) 9 6034-8829',
  departmentId: '0190f5a0-0000-7000-8000-000000000001',
  occupationId: '0190f5a0-0000-7000-8000-000000000002',
};

describe('cadastro do funcionário', () => {
  it('aceita celular com máscara e guarda só os dígitos', () => {
    expect(createEmployeeSchema.parse(valid)).toMatchObject({
      email: 'adriana.oliveira@farmarcas.com.br',
      mobile: '11960348829',
    });
  });

  it('exige celular com 11 dígitos e fixo com 10', () => {
    expect(createEmployeeSchema.safeParse({ ...valid, mobile: '1196034882' }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...valid, mobile: undefined }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...valid, landline: '113045000' }).success).toBe(false);
    expect(createEmployeeSchema.parse({ ...valid, landline: '' }).landline).toBeNull();
  });

  it('não aceita mais os campos antigos', () => {
    expect(createEmployeeSchema.safeParse({ ...valid, accessRole: 'PLATFORM_ADMIN' }).success).toBe(
      false,
    );
  });

  it('a edição exige a versão lida', () => {
    expect(updateEmployeeSchema.safeParse({ name: 'Outro Nome' }).success).toBe(false);
    expect(updateEmployeeSchema.safeParse({ version: 2, name: 'Outro Nome' }).success).toBe(true);
  });
});

describe('filtro por acesso', () => {
  it('aceita sistema e papel, e sem acesso', () => {
    expect(listEmployeesQuery.parse({ access: 'BACKOFFICE:MANAGER,NONE' }).access).toEqual([
      'BACKOFFICE:MANAGER',
      'NONE',
    ]);
    expect(listEmployeesQuery.safeParse({ access: 'BACKOFFICE:DONO' }).success).toBe(false);
  });
});
