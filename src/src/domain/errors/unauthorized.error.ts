import { DomainError } from './domain.error';

export class UnauthorizedError extends DomainError {
  readonly code: string;
  readonly statusCode = 401;

  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(message);
    this.code = code;
  }

  static invalidCredentials(): UnauthorizedError {
    return new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  static tokenExpired(): UnauthorizedError {
    return new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
  }

  static invalidToken(): UnauthorizedError {
    return new UnauthorizedError('Invalid token', 'INVALID_TOKEN');
  }
}
