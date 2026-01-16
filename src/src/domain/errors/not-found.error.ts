import { DomainError } from './domain.error';

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly resource: string;
  readonly resourceId: string;

  constructor(resource: string, resourceId: string) {
    super(`${resource} not found: ${resourceId}`);
    this.resource = resource;
    this.resourceId = resourceId;
  }
}
