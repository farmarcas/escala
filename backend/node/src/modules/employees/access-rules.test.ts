import { describe, expect, it } from 'vitest';
import {
  accessAction,
  accessSummary,
  isSelf,
  terminationSummary,
  wouldLeaveNoAdmin,
} from './access-rules.js';

describe('último administrador do Backoffice', () => {
  it('recusa tirar ou rebaixar o único administrador', () => {
    expect(wouldLeaveNoAdmin(['a'], 'a', null)).toBe(true);
    expect(wouldLeaveNoAdmin(['a'], 'a', 'MANAGER')).toBe(true);
  });

  it('deixa quando há outro administrador ou quando a pessoa continua administradora', () => {
    expect(wouldLeaveNoAdmin(['a', 'b'], 'a', null)).toBe(false);
    expect(wouldLeaveNoAdmin(['a'], 'a', 'ADMIN')).toBe(false);
    expect(wouldLeaveNoAdmin(['a'], 'b', null)).toBe(false);
  });
});

describe('histórico do acesso', () => {
  it('nomeia a ação e descreve antes e depois', () => {
    expect(accessAction(null, 'ANALYST')).toBe('ACCESS_GRANTED');
    expect(accessAction('ANALYST', 'MANAGER')).toBe('ACCESS_CHANGED');
    expect(accessAction('MANAGER', null)).toBe('ACCESS_REVOKED');
    expect(accessSummary('BACKOFFICE', 'ANALYST', 'MANAGER')).toBe('Backoffice: Analista → Gestor');
    expect(accessSummary('GESTAO_360', null, 'ANALYST')).toBe('Gestão 360: sem acesso → Analista');
  });

  it('lista os acessos encerrados no desligamento', () => {
    expect(
      terminationSummary([
        { system: 'BACKOFFICE', role: 'MANAGER' },
        { system: 'ESCALA', role: 'ANALYST' },
      ]),
    ).toBe('Acessos encerrados no desligamento: Backoffice (Gestor), Escala (Analista)');
  });
});

describe('próprio acesso', () => {
  it('só reconhece a pessoa quando há e-mail de quem usa', () => {
    expect(isSelf(undefined, 'ana@farmarcas.com.br')).toBe(false);
    expect(isSelf('ANA@farmarcas.com.br', 'ana@farmarcas.com.br')).toBe(true);
  });
});
