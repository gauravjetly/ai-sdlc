/**
 * Tests for Agent-related domain errors
 */

import {
  AgentNotAvailableError,
  AgentAllocationError,
  AgentNotFoundError,
  AgentBusyError,
  InvalidAgentTypeError,
  AgentPoolCapacityError,
  AgentLockError,
  AgentReleaseError,
  WrongAgentTypeError,
} from '../AgentErrors';
import { SchedulingError } from '../SchedulingError';

// Mock SDLCPhase enum to avoid uuid import issues
enum SDLCPhase {
  REQUIREMENTS = 'requirements',
  ARCHITECTURE = 'architecture',
  DEVELOPMENT = 'development',
  SECURITY = 'security',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  ACCEPTANCE = 'acceptance',
}

describe('AgentErrors', () => {
  describe('AgentNotAvailableError', () => {
    it('should create error with queue depth', () => {
      // Arrange & Act
      const error = new AgentNotAvailableError('developer_agent', 5);

      // Assert
      expect(error.message).toBe('No developer_agent agents available (5 projects waiting)');
      expect(error.code).toBe('AGENT_NOT_AVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.metadata).toEqual({
        agentType: 'developer_agent',
        queueDepth: 5,
      });
    });

    it('should create error without queue depth', () => {
      // Arrange & Act
      const error = new AgentNotAvailableError('ba_agent');

      // Assert
      expect(error.message).toBe('No ba_agent agents available');
      expect(error.metadata?.queueDepth).toBeUndefined();
    });

    it('should use 503 Service Unavailable status', () => {
      // Arrange & Act
      const error = new AgentNotAvailableError('qa_agent', 10);

      // Assert
      expect(error.statusCode).toBe(503);
    });
  });

  describe('AgentAllocationError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new AgentAllocationError(
        'agent-123',
        'developer_agent',
        'project-456',
        SDLCPhase.DEVELOPMENT,
        'Lock acquisition failed'
      );

      // Assert
      expect(error.message).toBe(
        'Failed to allocate agent agent-123 (developer_agent) to project project-456 for phase development: Lock acquisition failed'
      );
      expect(error.code).toBe('AGENT_ALLOCATION_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.metadata).toEqual({
        agentId: 'agent-123',
        agentType: 'developer_agent',
        projectId: 'project-456',
        phase: SDLCPhase.DEVELOPMENT,
        reason: 'Lock acquisition failed',
        originalError: undefined,
      });
    });

    it('should wrap original error', () => {
      // Arrange
      const originalError = new Error('Network timeout');

      // Act
      const error = new AgentAllocationError(
        'agent-123',
        'developer_agent',
        'project-456',
        SDLCPhase.DEVELOPMENT,
        'Allocation failed',
        originalError
      );

      // Assert
      expect(error.metadata?.originalError).toBe('Network timeout');
      expect(error.stack).toContain('Caused by:');
    });

    it('should preserve original error stack', () => {
      // Arrange
      const originalError = new Error('Database error');
      Error.captureStackTrace(originalError);

      // Act
      const error = new AgentAllocationError(
        'agent-123',
        'developer_agent',
        'project-456',
        SDLCPhase.TESTING,
        'Failed',
        originalError
      );

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AgentAllocationError');
    });
  });

  describe('AgentNotFoundError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new AgentNotFoundError('agent-123');

      // Assert
      expect(error.message).toBe('Agent not found: agent-123');
      expect(error.code).toBe('AGENT_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.metadata).toEqual({ agentId: 'agent-123' });
    });

    it('should be instance of SchedulingError', () => {
      // Arrange & Act
      const error = new AgentNotFoundError('agent-456');

      // Assert
      expect(error).toBeInstanceOf(SchedulingError);
      expect(error).toBeInstanceOf(AgentNotFoundError);
    });
  });

  describe('AgentBusyError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new AgentBusyError(
        'agent-123',
        'project-456',
        SDLCPhase.TESTING
      );

      // Assert
      expect(error.message).toBe(
        'Agent agent-123 is busy (assigned to project project-456, phase testing)'
      );
      expect(error.code).toBe('AGENT_BUSY');
      expect(error.statusCode).toBe(409);
      expect(error.metadata).toEqual({
        agentId: 'agent-123',
        assignedProjectId: 'project-456',
        assignedPhase: SDLCPhase.TESTING,
      });
    });

    it('should use 409 Conflict status', () => {
      // Arrange & Act
      const error = new AgentBusyError('agent-1', 'project-2', SDLCPhase.ARCHITECTURE);

      // Assert
      expect(error.statusCode).toBe(409);
    });
  });

  describe('InvalidAgentTypeError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new InvalidAgentTypeError('unknown_agent', [
        'ba_agent',
        'developer_agent',
        'qa_agent',
      ]);

      // Assert
      expect(error.message).toBe(
        'Invalid agent type: unknown_agent. Valid types: ba_agent, developer_agent, qa_agent'
      );
      expect(error.code).toBe('INVALID_AGENT_TYPE');
      expect(error.statusCode).toBe(422);
      expect(error.metadata).toEqual({
        agentType: 'unknown_agent',
        validTypes: ['ba_agent', 'developer_agent', 'qa_agent'],
      });
    });

    it('should list all valid agent types', () => {
      // Arrange
      const validTypes = [
        'ba_agent',
        'architect_agent',
        'developer_agent',
        'security_agent',
        'qa_agent',
        'sre_agent',
        'conductor_agent',
      ];

      // Act
      const error = new InvalidAgentTypeError('invalid', validTypes);

      // Assert
      expect(error.metadata?.validTypes).toEqual(validTypes);
      validTypes.forEach(type => {
        expect(error.message).toContain(type);
      });
    });
  });

  describe('AgentPoolCapacityError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new AgentPoolCapacityError(10, 10);

      // Assert
      expect(error.message).toBe('Agent pool at capacity: 10/10 agents busy');
      expect(error.code).toBe('AGENT_POOL_CAPACITY');
      expect(error.statusCode).toBe(503);
      expect(error.metadata).toEqual({
        totalAgents: 10,
        busyAgents: 10,
        availableAgents: 0,
      });
    });

    it('should calculate available agents', () => {
      // Arrange & Act
      const error = new AgentPoolCapacityError(20, 18);

      // Assert
      expect(error.metadata?.availableAgents).toBe(2);
    });

    it('should use 503 Service Unavailable status', () => {
      // Arrange & Act
      const error = new AgentPoolCapacityError(5, 5);

      // Assert
      expect(error.statusCode).toBe(503);
    });
  });

  describe('AgentLockError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new AgentLockError(
        'agent-123',
        'project-456',
        'Lock held by another process'
      );

      // Assert
      expect(error.message).toBe(
        'Failed to acquire lock for agent agent-123 (project project-456): Lock held by another process'
      );
      expect(error.code).toBe('AGENT_LOCK_FAILED');
      expect(error.statusCode).toBe(409);
      expect(error.metadata).toEqual({
        agentId: 'agent-123',
        projectId: 'project-456',
        reason: 'Lock held by another process',
      });
    });

    it('should use 409 Conflict status for lock contention', () => {
      // Arrange & Act
      const error = new AgentLockError('agent-1', 'project-2', 'Timeout');

      // Assert
      expect(error.statusCode).toBe(409);
    });
  });

  describe('AgentReleaseError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new AgentReleaseError(
        'agent-123',
        'project-456',
        'Agent state inconsistent'
      );

      // Assert
      expect(error.message).toBe(
        'Failed to release agent agent-123 from project project-456: Agent state inconsistent'
      );
      expect(error.code).toBe('AGENT_RELEASE_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.metadata).toEqual({
        agentId: 'agent-123',
        projectId: 'project-456',
        reason: 'Agent state inconsistent',
        originalError: undefined,
      });
    });

    it('should wrap original error', () => {
      // Arrange
      const originalError = new Error('State mutation failed');

      // Act
      const error = new AgentReleaseError(
        'agent-123',
        'project-456',
        'Release failed',
        originalError
      );

      // Assert
      expect(error.metadata?.originalError).toBe('State mutation failed');
      expect(error.stack).toContain('Caused by:');
    });

    it('should indicate potential resource leak with 500 status', () => {
      // Arrange & Act
      const error = new AgentReleaseError('agent-1', 'project-2', 'Failed');

      // Assert
      expect(error.statusCode).toBe(500);
    });
  });

  describe('WrongAgentTypeError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new WrongAgentTypeError(
        SDLCPhase.REQUIREMENTS,
        'developer_agent',
        'ba_agent'
      );

      // Assert
      expect(error.message).toBe(
        "Phase requirements requires agent type 'ba_agent', got 'developer_agent'"
      );
      expect(error.code).toBe('WRONG_AGENT_TYPE');
      expect(error.statusCode).toBe(422);
      expect(error.metadata).toEqual({
        phase: SDLCPhase.REQUIREMENTS,
        providedType: 'developer_agent',
        requiredType: 'ba_agent',
      });
    });

    it('should handle all phase-agent combinations', () => {
      // Arrange & Act
      const testCases = [
        { phase: SDLCPhase.ARCHITECTURE, provided: 'ba_agent', required: 'architect_agent' },
        { phase: SDLCPhase.DEVELOPMENT, provided: 'qa_agent', required: 'developer_agent' },
        { phase: SDLCPhase.TESTING, provided: 'developer_agent', required: 'qa_agent' },
      ];

      // Assert
      testCases.forEach(({ phase, provided, required }) => {
        const error = new WrongAgentTypeError(phase, provided, required);
        expect(error.message).toContain(phase);
        expect(error.message).toContain(provided);
        expect(error.message).toContain(required);
      });
    });
  });

  describe('API Response formatting', () => {
    it('should format all agent errors for API responses', () => {
      // Arrange
      const errors = [
        new AgentNotAvailableError('developer_agent', 5),
        new AgentAllocationError('a1', 'developer_agent', 'p1', SDLCPhase.DEVELOPMENT, 'Failed'),
        new AgentNotFoundError('agent-123'),
        new AgentBusyError('a1', 'p1', SDLCPhase.TESTING),
        new InvalidAgentTypeError('invalid', ['ba_agent']),
        new AgentPoolCapacityError(10, 10),
        new AgentLockError('a1', 'p1', 'Timeout'),
        new AgentReleaseError('a1', 'p1', 'Failed'),
        new WrongAgentTypeError(SDLCPhase.REQUIREMENTS, 'wrong', 'ba_agent'),
      ];

      // Act & Assert
      errors.forEach(error => {
        const response = error.toAPIResponse();
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
        expect(response.error).toHaveProperty('timestamp');
        expect(response.error).toHaveProperty('details');
        expect(response.error).not.toHaveProperty('stack');
      });
    });
  });

  describe('Error type checking', () => {
    it('should identify agent errors correctly', () => {
      // Arrange
      const agentError = new AgentNotFoundError('agent-123');
      const regularError = new Error('Regular error');

      // Act & Assert
      expect(SchedulingError.isSchedulingError(agentError)).toBe(true);
      expect(SchedulingError.isSchedulingError(regularError)).toBe(false);
      expect(SchedulingError.isErrorCode(agentError, 'AGENT_NOT_FOUND')).toBe(true);
      expect(SchedulingError.isErrorCode(agentError, 'OTHER_ERROR')).toBe(false);
    });
  });

  describe('Error serialization', () => {
    it('should serialize agent errors correctly', () => {
      // Arrange
      const error = new AgentAllocationError(
        'agent-123',
        'developer_agent',
        'project-456',
        SDLCPhase.DEVELOPMENT,
        'Test failure'
      );

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.code).toBe('AGENT_ALLOCATION_FAILED');
      expect(json.statusCode).toBe(500);
      expect(json.message).toContain('Test failure');
      expect(json.metadata).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper inheritance for all agent errors', () => {
      // Arrange
      const errors = [
        new AgentNotAvailableError('type'),
        new AgentNotFoundError('id'),
        new AgentBusyError('id', 'proj', SDLCPhase.TESTING),
      ];

      // Act & Assert
      errors.forEach(error => {
        expect(error).toBeInstanceOf(SchedulingError);
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});
