import { describe, expect, it } from 'vitest';
import { statusTransition } from './employee-status.js';

describe('funcionários · desligar e religar', () => {
  it('deve desligar quem está ativo e não acompanha nenhum grupo', () => {
    expect(statusTransition('ACTIVE', 'terminate', 0)).toEqual({
      to: 'TERMINATED',
      action: 'EMPLOYEE_TERMINATED',
      verb: 'desligado',
    });
  });

  it('deve recusar desligar quem ainda é Anjo de algum grupo', () => {
    expect(() => statusTransition('ACTIVE', 'terminate', 3)).toThrow(
      expect.objectContaining({ code: 'EMPLOYEE_HAS_PORTFOLIO' }),
    );
  });

  it('deve religar quem está desligado', () => {
    expect(statusTransition('TERMINATED', 'rehire', 0).to).toBe('ACTIVE');
  });

  it.each([
    ['ACTIVE', 'rehire'],
    ['TERMINATED', 'terminate'],
  ] as const)('deve recusar %s → %s', (current, action) => {
    expect(() => statusTransition(current, action, 0)).toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    );
  });
});
