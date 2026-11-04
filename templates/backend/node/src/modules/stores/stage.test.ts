import { describe, expect, it } from 'vitest';
import { stageChange } from './stage.js';

describe('lojas · etapa', () => {
  it('deve avançar sem justificativa', () => {
    expect(stageChange('PROSPECTING', { stage: 'SETUP' })).toEqual({ isBack: false });
  });

  it('deve pedir a data para inaugurar', () => {
    expect(() => stageChange('SETUP', { stage: 'OPENED' })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    );
    expect(stageChange('SETUP', { stage: 'OPENED', openedAt: '2026-10-31' })).toEqual({
      isBack: false,
    });
  });

  it('deve pedir justificativa para voltar', () => {
    expect(() => stageChange('OPENED', { stage: 'SETUP' })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    );
    expect(stageChange('OPENED', { stage: 'SETUP', justification: 'Reforma geral' })).toEqual({
      isBack: true,
    });
  });

  it('deve recusar a mesma etapa', () => {
    expect(() => stageChange('SETUP', { stage: 'SETUP' })).toThrow(
      expect.objectContaining({ code: 'STAGE_UNCHANGED' }),
    );
  });
});
