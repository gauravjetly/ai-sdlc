/**
 * Phase-Related Domain Errors
 *
 * Errors related to SDLC phase management:
 * - Invalid phase transitions
 * - Phase execution failures
 * - Phase not found
 * - Phase prerequisite violations
 */

import { SchedulingError, ErrorMetadata } from './SchedulingError';
import { SDLCPhase, PhaseStatus } from '../entities/ScheduledProject';

/**
 * Error thrown when a phase transition is invalid.
 * Examples:
 * - Starting a phase that's not PENDING
 * - Completing a phase that's not IN_PROGRESS
 * - Starting a phase before previous phase is complete
 *
 * HTTP Status: 400 Bad Request
 *
 * @example
 * throw new InvalidPhaseTransitionError(
 *   'project-123',
 *   SDLCPhase.DEVELOPMENT,
 *   PhaseStatus.COMPLETED,
 *   PhaseStatus.IN_PROGRESS
 * );
 */
export class InvalidPhaseTransitionError extends SchedulingError {
  constructor(
    projectId: string,
    phase: SDLCPhase,
    currentStatus: PhaseStatus,
    expectedStatus: PhaseStatus,
    operation?: string
  ) {
    const operationMsg = operation ? ` (operation: ${operation})` : '';
    super(
      `Cannot transition phase ${phase} from ${currentStatus} to ${expectedStatus}${operationMsg}`,
      'INVALID_PHASE_TRANSITION',
      400,
      {
        projectId,
        phase,
        currentStatus,
        expectedStatus,
        operation,
      }
    );
  }
}

/**
 * Error thrown when a phase prerequisite is not satisfied.
 * Example: Starting DEVELOPMENT phase before ARCHITECTURE is complete
 *
 * HTTP Status: 400 Bad Request
 *
 * @example
 * throw new PhasePrerequisiteError(
 *   'project-123',
 *   SDLCPhase.DEVELOPMENT,
 *   SDLCPhase.ARCHITECTURE,
 *   PhaseStatus.IN_PROGRESS
 * );
 */
export class PhasePrerequisiteError extends SchedulingError {
  constructor(
    projectId: string,
    phase: SDLCPhase,
    prerequisitePhase: SDLCPhase,
    prerequisiteStatus: PhaseStatus
  ) {
    super(
      `Cannot start ${phase}: prerequisite phase ${prerequisitePhase} is in status ${prerequisiteStatus} (expected completed or skipped)`,
      'PHASE_PREREQUISITE_NOT_MET',
      400,
      {
        projectId,
        phase,
        prerequisitePhase,
        prerequisiteStatus,
      }
    );
  }
}

/**
 * Error thrown when phase execution fails.
 * This is a wrapper for agent execution failures.
 *
 * HTTP Status: 500 Internal Server Error
 *
 * @example
 * throw new PhaseExecutionError(
 *   'project-123',
 *   SDLCPhase.TESTING,
 *   'Test suite failed with 5 errors'
 * );
 */
export class PhaseExecutionError extends SchedulingError {
  constructor(
    projectId: string,
    phase: SDLCPhase,
    reason: string,
    originalError?: Error
  ) {
    super(
      `Phase ${phase} execution failed: ${reason}`,
      'PHASE_EXECUTION_FAILED',
      500,
      {
        projectId,
        phase,
        reason,
        originalError: originalError?.message,
      }
    );

    // Preserve original error stack if available
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

/**
 * Error thrown when a phase is not found in a project.
 * This indicates a data integrity issue.
 *
 * HTTP Status: 500 Internal Server Error
 *
 * @example
 * throw new PhaseNotFoundError('project-123', SDLCPhase.DEVELOPMENT);
 */
export class PhaseNotFoundError extends SchedulingError {
  constructor(projectId: string, phase: SDLCPhase) {
    super(
      `Phase ${phase} not found in project ${projectId}`,
      'PHASE_NOT_FOUND',
      500,
      {
        projectId,
        phase,
      }
    );
  }
}

/**
 * Error thrown when attempting to start a phase without an assigned agent.
 *
 * HTTP Status: 400 Bad Request
 *
 * @example
 * throw new PhaseAgentRequiredError('project-123', SDLCPhase.DEVELOPMENT);
 */
export class PhaseAgentRequiredError extends SchedulingError {
  constructor(projectId: string, phase: SDLCPhase) {
    super(
      `Cannot start phase ${phase}: agent must be assigned first`,
      'PHASE_AGENT_REQUIRED',
      400,
      {
        projectId,
        phase,
      }
    );
  }
}

/**
 * Error thrown when a phase is already in progress.
 * Prevents concurrent execution of the same phase.
 *
 * HTTP Status: 409 Conflict
 *
 * @example
 * throw new PhaseAlreadyInProgressError('project-123', SDLCPhase.TESTING, 'agent-456');
 */
export class PhaseAlreadyInProgressError extends SchedulingError {
  constructor(projectId: string, phase: SDLCPhase, assignedAgentId: string) {
    super(
      `Phase ${phase} is already in progress (assigned to agent ${assignedAgentId})`,
      'PHASE_ALREADY_IN_PROGRESS',
      409,
      {
        projectId,
        phase,
        assignedAgentId,
      }
    );
  }
}

/**
 * Error thrown when trying to complete a phase without artifacts.
 * Some phases require artifacts to be considered complete.
 *
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * throw new PhaseArtifactsRequiredError('project-123', SDLCPhase.REQUIREMENTS);
 */
export class PhaseArtifactsRequiredError extends SchedulingError {
  constructor(projectId: string, phase: SDLCPhase, requiredArtifacts: string[]) {
    super(
      `Phase ${phase} requires artifacts: ${requiredArtifacts.join(', ')}`,
      'PHASE_ARTIFACTS_REQUIRED',
      422,
      {
        projectId,
        phase,
        requiredArtifacts,
      }
    );
  }
}
