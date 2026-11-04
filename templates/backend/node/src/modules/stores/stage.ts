import { ConflictError } from '../../shared/errors/conflict-error.js';
import { ValidationError } from '../../shared/errors/validation-error.js';

export type StoreStageValue = 'PROSPECTING' | 'SETUP' | 'OPENED';

export const STAGE_LABEL: Record<StoreStageValue, string> = {
  PROSPECTING: 'Prospecção',
  SETUP: 'Montagem',
  OPENED: 'Inaugurada',
};

const ORDER: Record<StoreStageValue, number> = { PROSPECTING: 0, SETUP: 1, OPENED: 2 };

// Etapa da loja na rede (spec 003, FR-040): avançar é livre; chegar em Inaugurada pede a
// data de inauguração; voltar pede justificativa.
export const stageChange = (
  current: StoreStageValue,
  input: { stage: StoreStageValue; openedAt?: string; justification?: string },
): { isBack: boolean } => {
  if (input.stage === current) {
    throw new ConflictError('A loja já está nessa etapa', 'STAGE_UNCHANGED');
  }
  const isBack = ORDER[input.stage] < ORDER[current];
  const issues: { path: string; message: string }[] = [];
  if (input.stage === 'OPENED' && !input.openedAt) {
    issues.push({ path: 'openedAt', message: 'Informe a data de inauguração' });
  }
  if (isBack && !input.justification) {
    issues.push({ path: 'justification', message: 'Voltar de etapa pede justificativa' });
  }
  if (issues.length > 0) throw new ValidationError('Dados inválidos', issues);
  return { isBack };
};
