/**
 * Scheduling Domain Errors
 *
 * Centralized exports for all domain error classes.
 * These errors replace string-based error handling with strongly-typed errors.
 *
 * @module scheduling/domain/errors
 */

// Base error class
export { SchedulingError, ErrorMetadata, SerializedError } from './SchedulingError';

// Project errors
export {
  ProjectNotFoundError,
  ProjectAlreadyExistsError,
  InvalidProjectStateError,
  InvalidDeadlineError,
  ProjectValidationError,
  ProjectNameTooLongError,
  InvalidPhaseCountError,
} from './ProjectErrors';

// Phase errors
export {
  InvalidPhaseTransitionError,
  PhasePrerequisiteError,
  PhaseExecutionError,
  PhaseNotFoundError,
  PhaseAgentRequiredError,
  PhaseAlreadyInProgressError,
  PhaseArtifactsRequiredError,
} from './PhaseErrors';

// Agent errors
export {
  AgentNotAvailableError,
  AgentAllocationError,
  AgentNotFoundError,
  AgentBusyError,
  InvalidAgentTypeError,
  AgentPoolCapacityError,
  AgentLockError,
  AgentReleaseError,
  WrongAgentTypeError,
} from './AgentErrors';
