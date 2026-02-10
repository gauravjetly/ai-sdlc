/**
 * Project-Related Domain Errors
 *
 * Errors related to project lifecycle management:
 * - Project not found
 * - Duplicate projects
 * - Invalid project state transitions
 * - Invalid deadlines
 */

import { SchedulingError, ErrorMetadata } from './SchedulingError';
import { ProjectStatus } from '../entities/ScheduledProject';

/**
 * Error thrown when a project cannot be found by ID.
 *
 * HTTP Status: 404 Not Found
 *
 * @example
 * throw new ProjectNotFoundError('project-123');
 */
export class ProjectNotFoundError extends SchedulingError {
  constructor(projectId: string) {
    super(
      `Project not found: ${projectId}`,
      'PROJECT_NOT_FOUND',
      404,
      { projectId }
    );
  }
}

/**
 * Error thrown when attempting to create a project that already exists.
 *
 * HTTP Status: 409 Conflict
 *
 * @example
 * throw new ProjectAlreadyExistsError('project-123', 'My Project');
 */
export class ProjectAlreadyExistsError extends SchedulingError {
  constructor(projectId: string, projectName: string) {
    super(
      `Project already exists: ${projectName} (${projectId})`,
      'PROJECT_ALREADY_EXISTS',
      409,
      { projectId, projectName }
    );
  }
}

/**
 * Error thrown when attempting an operation on a project in an invalid state.
 *
 * HTTP Status: 400 Bad Request
 *
 * @example
 * throw new InvalidProjectStateError(
 *   'project-123',
 *   'Cannot schedule project',
 *   ProjectStatus.COMPLETED,
 *   [ProjectStatus.DRAFT]
 * );
 */
export class InvalidProjectStateError extends SchedulingError {
  constructor(
    projectId: string,
    operation: string,
    currentState: ProjectStatus,
    expectedStates: ProjectStatus[]
  ) {
    const expectedList = expectedStates.join(', ');
    super(
      `${operation}: Project is in state '${currentState}', expected one of: ${expectedList}`,
      'INVALID_PROJECT_STATE',
      400,
      {
        projectId,
        operation,
        currentState,
        expectedStates,
      }
    );
  }
}

/**
 * Error thrown when a project deadline is invalid.
 * Examples:
 * - Deadline in the past
 * - Deadline before start date
 * - Invalid date format
 *
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * throw new InvalidDeadlineError(
 *   'Delivery date cannot be in the past',
 *   pastDate
 * );
 */
export class InvalidDeadlineError extends SchedulingError {
  constructor(reason: string, deadline: Date, metadata?: ErrorMetadata) {
    super(
      `Invalid deadline: ${reason}`,
      'INVALID_DEADLINE',
      422,
      {
        reason,
        deadline: deadline.toISOString(),
        ...metadata,
      }
    );
  }
}

/**
 * Error thrown when project validation fails.
 * Used for business rule violations like:
 * - Missing required fields
 * - Invalid field values
 * - Constraint violations
 *
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * throw new ProjectValidationError('Project name is required', {
 *   field: 'name',
 *   constraint: 'required'
 * });
 */
export class ProjectValidationError extends SchedulingError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(
      message,
      'PROJECT_VALIDATION_FAILED',
      422,
      metadata
    );
  }
}

/**
 * Error thrown when project name exceeds maximum length.
 *
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * throw new ProjectNameTooLongError(250, 200);
 */
export class ProjectNameTooLongError extends SchedulingError {
  constructor(actualLength: number, maxLength: number) {
    super(
      `Project name must be ${maxLength} characters or less (got ${actualLength})`,
      'PROJECT_NAME_TOO_LONG',
      422,
      { actualLength, maxLength }
    );
  }
}

/**
 * Error thrown when project has invalid phase count.
 * SDLC projects must have exactly 7 phases.
 *
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * throw new InvalidPhaseCountError(5, 7);
 */
export class InvalidPhaseCountError extends SchedulingError {
  constructor(actualCount: number, expectedCount: number) {
    super(
      `Project must have exactly ${expectedCount} SDLC phases (got ${actualCount})`,
      'INVALID_PHASE_COUNT',
      422,
      { actualCount, expectedCount }
    );
  }
}
