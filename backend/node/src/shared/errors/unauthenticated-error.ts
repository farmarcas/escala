import { AppError } from './app-error.js';

export class UnauthenticatedError extends AppError {
  constructor(message = 'Identidade não informada') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}
