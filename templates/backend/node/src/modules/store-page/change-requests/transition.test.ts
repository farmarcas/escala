import { describe, expect, it } from 'vitest';
import { viewerOf } from '../permissions.js';
import { transition, type RequestState } from './transition.js';

const admin = viewerOf({ kind: 'platform', subject: 'OP-02', role: 'PLATFORM_ADMIN' }, 'ACTIVE');
const analyst = viewerOf(
  { kind: 'platform', subject: 'OP-07', role: 'PLATFORM_ANALYST' },
  'ACTIVE',
);
const owner = viewerOf(
  { kind: 'tenant', subject: 'F-1A0PR', role: 'TENANT_ADMIN', tenantId: 'g1' },
  'ACTIVE',
);

const state = (overrides: Partial<RequestState> = {}): RequestState => ({
  type: 'TAX_REGIME',
  status: 'OPEN',
  currentStep: 1,
  origin: 'TENANT',
  attachedDocuments: ['OPTION_TERM'],
  ...overrides,
});

describe('transition', () => {
  it('Farmarcas aprova a análise contábil e o regime fica vigente', () => {
    expect(transition(state(), 'advance', admin)).toEqual({
      status: 'EFFECTIVE',
      currentStep: 2,
      eventAction: 'EFFECTIVE',
      stepIndex: 1,
      becameEffective: true,
    });
  });

  it('o grupo não age na etapa da Farmarcas', () => {
    expect(() => transition(state(), 'advance', owner)).toThrow(
      expect.objectContaining({ code: 'NOT_YOUR_STEP' }),
    );
  });

  it('analista não age', () => {
    expect(() => transition(state(), 'advance', analyst)).toThrow();
  });

  it('não avança sem os documentos exigidos', () => {
    expect(() => transition(state({ attachedDocuments: [] }), 'advance', admin)).toThrow(
      expect.objectContaining({ code: 'DOCS_MISSING' }),
    );
  });

  it('endereço: o grupo conclui o envio de documentos e passa para a Farmarcas', () => {
    const result = transition(
      state({
        type: 'ADDRESS',
        attachedDocuments: ['ADDRESS_PROOF', 'OPERATING_PERMIT', 'SANITARY_LICENSE'],
      }),
      'advance',
      owner,
    );
    expect(result).toMatchObject({ status: 'OPEN', currentStep: 2, eventAction: 'STEP_DONE' });
  });

  it('reprovar exige motivo', () => {
    expect(() => transition(state(), 'reject', admin, '  ')).toThrow(
      expect.objectContaining({ code: 'REASON_REQUIRED' }),
    );
    expect(transition(state(), 'reject', admin, 'Falta o termo assinado').status).toBe('REJECTED');
  });

  it('bandeira: o grupo contesta só na etapa de ciência, com motivo', () => {
    const ciencia = state({ type: 'BRAND', currentStep: 2, attachedDocuments: [] });
    expect(transition(ciencia, 'contest', owner, 'Não concordamos').status).toBe('CONTESTED');
    expect(() =>
      transition(state({ type: 'BRAND', currentStep: 3 }), 'contest', owner, 'x'),
    ).toThrow(expect.objectContaining({ code: 'CONTEST_NOT_ALLOWED' }));
  });

  it('só quem abriu cancela', () => {
    expect(transition(state(), 'cancel', owner).status).toBe('CANCELLED');
    expect(() => transition(state(), 'cancel', admin)).toThrow(
      expect.objectContaining({ code: 'NOT_YOUR_REQUEST' }),
    );
  });

  it('solicitação encerrada não muda mais', () => {
    expect(() => transition(state({ status: 'EFFECTIVE' }), 'advance', admin)).toThrow(
      expect.objectContaining({ code: 'REQUEST_CLOSED' }),
    );
  });

  it('CNPJ: a Farmarcas conclui a validação na Receita (etapa do sistema)', () => {
    const result = transition(state({ type: 'CNPJ', attachedDocuments: [] }), 'advance', admin);
    expect(result).toMatchObject({ status: 'OPEN', currentStep: 2 });
  });
});
