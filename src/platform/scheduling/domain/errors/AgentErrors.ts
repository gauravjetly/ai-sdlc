/**
 * Agent-Related Domain Errors
 *
 * Errors related to agent pool management and allocation:
 * - Agent not available
 * - Agent allocation failures
 * - Agent not found
 * - Agent busy/unavailable
 */

import { SchedulingError, ErrorMetadata } from './SchedulingError';
import { SDLCPhase } from '../entities/ScheduledProject';

/**
 * Error thrown when no agents are available for allocation.
 * This is not an error condition per se, but indicates resource contention.
 *
 * HTTP Status: 503 Service Unavailable
 *
 * @example
 * throw new AgentNotAvailableError('developer_agent', 5);
 */
export class AgentNotAvailableError extends SchedulingError {
  constructor(agentType: string, queueDepth?: number) {
    const queueMsg = queueDepth !== undefined
      ? ` (${queueDepth} projects waiting)`
      : '';
    super(
      `No ${agentType} agents available${queueMsg}`,
      'AGENT_NOT_AVAILABLE',
      503,
      {
        agentType,
        queueDepth,
      }
    );
  }
}

/**
 * Error thrown when agent allocation fails for any reason.
 * This is a general-purpose error for allocation failures.
 *
 * HTTP Status: 500 Internal Server Error
 *
 * @example
 * throw new AgentAllocationError(
 *   'agent-123',
 *   'developer_agent',
 *   'project-456',
 *   SDLCPhase.DEVELOPMENT,
 *   'Lock acquisition failed'
 * );
 */
export class AgentAllocationError extends SchedulingError {
  constructor(
    agentId: string,
    agentType: string,
    projectId: string,
    phase: SDLCPhase,
    reason: string,
    originalError?: Error
  ) {
    super(
      `Failed to allocate agent ${agentId} (${agentType}) to project ${projectId} for phase ${phase}: ${reason}`,
      'AGENT_ALLOCATION_FAILED',
      500,
      {
        agentId,
        agentType,
        projectId,
        phase,
        reason,
        originalError: originalError?.message,
      }
    );

    // Preserve original error stack
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

/**
 * Error thrown when an agent cannot be found by ID.
 *
 * HTTP Status: 404 Not Found
 *
 * @example
 * throw new AgentNotFoundError('agent-123');
 */
export class AgentNotFoundError extends SchedulingError {
  constructor(agentId: string) {
    super(
      `Agent not found: ${agentId}`,
      'AGENT_NOT_FOUND',
      404,
      { agentId }
    );
  }
}

/**
 * Error thrown when trying to allocate an agent that is already busy.
 * This prevents double-allocation of agents.
 *
 * HTTP Status: 409 Conflict
 *
 * @example
 * throw new AgentBusyError('agent-123', 'project-456', SDLCPhase.TESTING);
 */
export class AgentBusyError extends SchedulingError {
  constructor(agentId: string, assignedProjectId: string, assignedPhase: SDLCPhase) {
    super(
      `Agent ${agentId} is busy (assigned to project ${assignedProjectId}, phase ${assignedPhase})`,
      'AGENT_BUSY',
      409,
      {
        agentId,
        assignedProjectId,
        assignedPhase,
      }
    );
  }
}

/**
 * Error thrown when an invalid agent type is specified.
 * Valid agent types are defined in PHASE_AGENT_MAP.
 *
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * throw new InvalidAgentTypeError('unknown_agent', ['ba_agent', 'developer_agent']);
 */
export class InvalidAgentTypeError extends SchedulingError {
  constructor(agentType: string, validTypes: string[]) {
    super(
      `Invalid agent type: ${agentType}. Valid types: ${validTypes.join(', ')}`,
      'INVALID_AGENT_TYPE',
      422,
      {
        agentType,
        validTypes,
      }
    );
  }
}

/**
 * Error thrown when agent pool is at capacity.
 * Indicates system-wide resource exhaustion.
 *
 * HTTP Status: 503 Service Unavailable
 *
 * @example
 * throw new AgentPoolCapacityError(10, 10);
 */
export class AgentPoolCapacityError extends SchedulingError {
  constructor(totalAgents: number, busyAgents: number) {
    super(
      `Agent pool at capacity: ${busyAgents}/${totalAgents} agents busy`,
      'AGENT_POOL_CAPACITY',
      503,
      {
        totalAgents,
        busyAgents,
        availableAgents: totalAgents - busyAgents,
      }
    );
  }
}

/**
 * Error thrown when agent lock acquisition fails.
 * Used in distributed systems to prevent race conditions.
 *
 * HTTP Status: 409 Conflict
 *
 * @example
 * throw new AgentLockError('agent-123', 'project-456', 'Lock held by another process');
 */
export class AgentLockError extends SchedulingError {
  constructor(agentId: string, projectId: string, reason: string) {
    super(
      `Failed to acquire lock for agent ${agentId} (project ${projectId}): ${reason}`,
      'AGENT_LOCK_FAILED',
      409,
      {
        agentId,
        projectId,
        reason,
      }
    );
  }
}

/**
 * Error thrown when agent release fails.
 * This can cause resource leaks if not handled properly.
 *
 * HTTP Status: 500 Internal Server Error
 *
 * @example
 * throw new AgentReleaseError('agent-123', 'project-456', 'Agent state inconsistent');
 */
export class AgentReleaseError extends SchedulingError {
  constructor(agentId: string, projectId: string, reason: string, originalError?: Error) {
    super(
      `Failed to release agent ${agentId} from project ${projectId}: ${reason}`,
      'AGENT_RELEASE_FAILED',
      500,
      {
        agentId,
        projectId,
        reason,
        originalError: originalError?.message,
      }
    );

    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

/**
 * Error thrown when wrong agent type is assigned to a phase.
 * Example: Assigning a developer_agent to REQUIREMENTS phase
 *
 * HTTP Status: 422 Unprocessable Entity
 *
 * @example
 * throw new WrongAgentTypeError(
 *   SDLCPhase.REQUIREMENTS,
 *   'developer_agent',
 *   'ba_agent'
 * );
 */
export class WrongAgentTypeError extends SchedulingError {
  constructor(phase: SDLCPhase, providedType: string, requiredType: string) {
    super(
      `Phase ${phase} requires agent type '${requiredType}', got '${providedType}'`,
      'WRONG_AGENT_TYPE',
      422,
      {
        phase,
        providedType,
        requiredType,
      }
    );
  }
}
