import { DomainError } from './domain.error';

export interface ValidationDetail {
  field: string;
  code: string;
  message: string;
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly details: ValidationDetail[];

  constructor(message: string, details: ValidationDetail[] = []) {
    super(message);
    this.details = details;
  }

  static fromField(field: string, message: string): ValidationError {
    return new ValidationError('Validation failed', [
      { field, code: 'INVALID', message },
    ]);
  }

  static fromFields(details: ValidationDetail[]): ValidationError {
    return new ValidationError('Validation failed', details);
  }
}
