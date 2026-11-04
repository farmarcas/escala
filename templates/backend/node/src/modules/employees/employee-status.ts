import { ConflictError } from '../../shared/errors/conflict-error.js';
import type { EmployeeStatusChangeInput, EmployeeStatusValue } from './employees.schemas.js';

type Transition = { to: EmployeeStatusValue; action: string; verb: string };

const TRANSITIONS: Record<
  EmployeeStatusChangeInput['action'],
  Transition & { from: EmployeeStatusValue }
> = {
  terminate: { from: 'ACTIVE', to: 'TERMINATED', action: 'EMPLOYEE_TERMINATED', verb: 'desligado' },
  rehire: { from: 'TERMINATED', to: 'ACTIVE', action: 'EMPLOYEE_REHIRED', verb: 'religado' },
};

// Desligar ou religar um funcionário. Quem é Anjo de grupo em operação não é desligado:
// os grupos passam a outro Anjo antes (spec 003, FR-014).
export const statusTransition = (
  current: EmployeeStatusValue,
  action: EmployeeStatusChangeInput['action'],
  portfolioCount: number,
): Transition => {
  const transition = TRANSITIONS[action];
  if (transition.from !== current) {
    throw new ConflictError(
      'Esta mudança de situação não é permitida a partir da situação atual',
      'INVALID_STATUS_TRANSITION',
    );
  }
  if (action === 'terminate' && portfolioCount > 0) {
    throw new ConflictError(
      `Esta pessoa é Anjo de ${portfolioCount} ${portfolioCount === 1 ? 'grupo' : 'grupos'}. Passe os grupos a outro Anjo antes de desligar.`,
      'EMPLOYEE_HAS_PORTFOLIO',
    );
  }
  const { to, action: auditAction, verb } = transition;
  return { to, action: auditAction, verb };
};
