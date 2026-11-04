import { AppError } from '../../../shared/errors/app-error.js';
import { ConflictError } from '../../../shared/errors/conflict-error.js';
import { ForbiddenError } from '../../../shared/errors/forbidden-error.js';
import { ownsStep, type Viewer } from '../permissions.js';
import { REQUEST_TYPES, type RequestType } from './types.js';

export type RequestStatus = 'OPEN' | 'EFFECTIVE' | 'REJECTED' | 'CONTESTED' | 'CANCELLED';
export type RequestAction = 'advance' | 'reject' | 'contest' | 'cancel';

export type RequestState = {
  type: RequestType;
  status: RequestStatus;
  currentStep: number;
  origin: 'PLATFORM' | 'TENANT';
  attachedDocuments: string[];
};

export type TransitionResult = {
  status: RequestStatus;
  currentStep: number;
  eventAction: 'STEP_DONE' | 'EFFECTIVE' | 'REJECTED' | 'CONTESTED' | 'CANCELLED';
  stepIndex: number;
  becameEffective: boolean;
};

export const missingDocuments = (state: Pick<RequestState, 'type' | 'attachedDocuments'>) =>
  REQUEST_TYPES[state.type].documents.filter((doc) => !state.attachedDocuments.includes(doc));

const reasonRequired = () =>
  new AppError('Informe o motivo para continuar', 400, 'REASON_REQUIRED');

// Regra pura das etapas: quem pode o quê e qual o próximo estado (spec 002, US3).
export const transition = (
  state: RequestState,
  action: RequestAction,
  viewer: Viewer,
  note?: string,
): TransitionResult => {
  if (state.status !== 'OPEN') {
    throw new ConflictError('Esta solicitação já foi encerrada', 'REQUEST_CLOSED');
  }
  if (viewer.isReadOnly) throw new ForbiddenError('Somente leitura');

  const definition = REQUEST_TYPES[state.type];
  const step = definition.steps[state.currentStep];
  if (!step) throw new ConflictError('Etapa inválida', 'REQUEST_CLOSED');
  const hasNote = Boolean(note?.trim());

  if (action === 'cancel') {
    const mine = (state.origin === 'PLATFORM') === (viewer.side === 'platform');
    if (!mine)
      throw new ForbiddenError('Só quem abriu a solicitação pode cancelar', 'NOT_YOUR_REQUEST');
    return {
      status: 'CANCELLED',
      currentStep: state.currentStep,
      eventAction: 'CANCELLED',
      stepIndex: state.currentStep,
      becameEffective: false,
    };
  }

  if (!ownsStep(viewer, step.owner)) {
    throw new ForbiddenError(
      'Esta etapa não é sua: aguarde quem é responsável por ela',
      'NOT_YOUR_STEP',
    );
  }

  if (action === 'reject') {
    if (viewer.side !== 'platform')
      throw new ForbiddenError('Só a Farmarcas reprova', 'NOT_YOUR_STEP');
    if (!hasNote) throw reasonRequired();
    return {
      status: 'REJECTED',
      currentStep: state.currentStep,
      eventAction: 'REJECTED',
      stepIndex: state.currentStep,
      becameEffective: false,
    };
  }

  if (action === 'contest') {
    if (!step.allowsContest)
      throw new ConflictError('Esta etapa não aceita contestação', 'CONTEST_NOT_ALLOWED');
    if (!hasNote) throw reasonRequired();
    return {
      status: 'CONTESTED',
      currentStep: state.currentStep,
      eventAction: 'CONTESTED',
      stepIndex: state.currentStep,
      becameEffective: false,
    };
  }

  if (step.requiresDocuments && missingDocuments(state).length > 0) {
    throw new ConflictError(
      'Anexe os documentos pendentes antes de concluir esta etapa',
      'DOCS_MISSING',
    );
  }

  const next = state.currentStep + 1;
  const isLast = next >= definition.steps.length - 1;
  return {
    status: isLast ? 'EFFECTIVE' : 'OPEN',
    currentStep: next,
    eventAction: isLast ? 'EFFECTIVE' : 'STEP_DONE',
    stepIndex: state.currentStep,
    becameEffective: isLast,
  };
};
