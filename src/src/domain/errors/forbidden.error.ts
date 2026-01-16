import { DomainError } from './domain.error';

export class ForbiddenError extends DomainError {
  readonly code = 'ACCESS_DENIED';
  readonly statusCode = 403;

  constructor(message: string = 'Access denied') {
    super(message);
  }
}
