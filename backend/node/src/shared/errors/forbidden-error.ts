import { AppError } from './app-error.js';

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso não permitido para este papel', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}
