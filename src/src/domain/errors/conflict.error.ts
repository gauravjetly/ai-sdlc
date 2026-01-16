import { DomainError } from './domain.error';

export class ConflictError extends DomainError {
  readonly code: string;
  readonly statusCode = 409;

  constructor(message: string, code: string = 'CONFLICT') {
    super(message);
    this.code = code;
  }

  static emailExists(): ConflictError {
    return new ConflictError('Email already registered', 'EMAIL_EXISTS');
  }
}
