/**
 * Tests for Phase-related domain errors
 */

import {
  InvalidPhaseTransitionError,
  PhasePrerequisiteError,
  PhaseExecutionError,
  PhaseNotFoundError,
  PhaseAgentRequiredError,
  PhaseAlreadyInProgressError,
  PhaseArtifactsRequiredError,
} from '../PhaseErrors';
import { SchedulingError } from '../SchedulingError';

// Mock enums to avoid uuid import issues
enum SDLCPhase {
  REQUIREMENTS = 'requirements',
  ARCHITECTURE = 'architecture',
  DEVELOPMENT = 'development',
  SECURITY = 'security',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  ACCEPTANCE = 'acceptance',
}

enum PhaseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped',
}

describe('PhaseErrors', () => {
  describe('InvalidPhaseTransitionError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new InvalidPhaseTransitionError(
        'project-123',
        SDLCPhase.DEVELOPMENT,
        PhaseStatus.COMPLETED,
        PhaseStatus.IN_PROGRESS
      );

      // Assert
      expect(error.message).toBe(
        'Cannot transition phase development from completed to in_progress'
      );
      expect(error.code).toBe('INVALID_PHASE_TRANSITION');
      expect(error.statusCode).toBe(400);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        phase: SDLCPhase.DEVELOPMENT,
        currentStatus: PhaseStatus.COMPLETED,
        expectedStatus: PhaseStatus.IN_PROGRESS,
        operation: undefined,
      });
    });

    it('should include operation in message when provided', () => {
      // Arrange & Act
      const error = new InvalidPhaseTransitionError(
        'project-123',
        SDLCPhase.TESTING,
        PhaseStatus.FAILED,
        PhaseStatus.IN_PROGRESS,
        'startPhase'
      );

      // Assert
      expect(error.message).toContain('(operation: startPhase)');
      expect(error.metadata?.operation).toBe('startPhase');
    });

    it('should be instance of SchedulingError', () => {
      // Arrange & Act
      const error = new InvalidPhaseTransitionError(
        'project-123',
        SDLCPhase.REQUIREMENTS,
        PhaseStatus.PENDING,
        PhaseStatus.COMPLETED
      );

      // Assert
      expect(error).toBeInstanceOf(SchedulingError);
      expect(error).toBeInstanceOf(InvalidPhaseTransitionError);
    });
  });

  describe('PhasePrerequisiteError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new PhasePrerequisiteError(
        'project-123',
        SDLCPhase.DEVELOPMENT,
        SDLCPhase.ARCHITECTURE,
        PhaseStatus.IN_PROGRESS
      );

      // Assert
      expect(error.message).toBe(
        'Cannot start development: prerequisite phase architecture is in status in_progress (expected completed or skipped)'
      );
      expect(error.code).toBe('PHASE_PREREQUISITE_NOT_MET');
      expect(error.statusCode).toBe(400);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        phase: SDLCPhase.DEVELOPMENT,
        prerequisitePhase: SDLCPhase.ARCHITECTURE,
        prerequisiteStatus: PhaseStatus.IN_PROGRESS,
      });
    });

    it('should handle all phase combinations', () => {
      // Arrange & Act
      const error = new PhasePrerequisiteError(
        'project-456',
        SDLCPhase.ACCEPTANCE,
        SDLCPhase.DEPLOYMENT,
        PhaseStatus.FAILED
      );

      // Assert
      expect(error.message).toContain('acceptance');
      expect(error.message).toContain('deployment');
      expect(error.message).toContain('failed');
    });
  });

  describe('PhaseExecutionError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new PhaseExecutionError(
        'project-123',
        SDLCPhase.TESTING,
        'Test suite failed with 5 errors'
      );

      // Assert
      expect(error.message).toBe(
        'Phase testing execution failed: Test suite failed with 5 errors'
      );
      expect(error.code).toBe('PHASE_EXECUTION_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        phase: SDLCPhase.TESTING,
        reason: 'Test suite failed with 5 errors',
        originalError: undefined,
      });
    });

    it('should wrap original error', () => {
      // Arrange
      const originalError = new Error('Database connection failed');

      // Act
      const error = new PhaseExecutionError(
        'project-123',
        SDLCPhase.DEVELOPMENT,
        'Build failed',
        originalError
      );

      // Assert
      expect(error.metadata?.originalError).toBe('Database connection failed');
      expect(error.stack).toContain('Caused by:');
    });

    it('should preserve original error stack', () => {
      // Arrange
      const originalError = new Error('Original error');
      Error.captureStackTrace(originalError);

      // Act
      const error = new PhaseExecutionError(
        'project-123',
        SDLCPhase.SECURITY,
        'Security scan failed',
        originalError
      );

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('PhaseExecutionError');
    });
  });

  describe('PhaseNotFoundError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new PhaseNotFoundError('project-123', SDLCPhase.DEVELOPMENT);

      // Assert
      expect(error.message).toBe('Phase development not found in project project-123');
      expect(error.code).toBe('PHASE_NOT_FOUND');
      expect(error.statusCode).toBe(500);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        phase: SDLCPhase.DEVELOPMENT,
      });
    });

    it('should indicate data integrity issue with 500 status', () => {
      // Arrange & Act
      const error = new PhaseNotFoundError('project-456', SDLCPhase.REQUIREMENTS);

      // Assert
      expect(error.statusCode).toBe(500);
    });
  });

  describe('PhaseAgentRequiredError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new PhaseAgentRequiredError('project-123', SDLCPhase.DEVELOPMENT);

      // Assert
      expect(error.message).toBe(
        'Cannot start phase development: agent must be assigned first'
      );
      expect(error.code).toBe('PHASE_AGENT_REQUIRED');
      expect(error.statusCode).toBe(400);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        phase: SDLCPhase.DEVELOPMENT,
      });
    });
  });

  describe('PhaseAlreadyInProgressError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new PhaseAlreadyInProgressError(
        'project-123',
        SDLCPhase.TESTING,
        'agent-456'
      );

      // Assert
      expect(error.message).toBe(
        'Phase testing is already in progress (assigned to agent agent-456)'
      );
      expect(error.code).toBe('PHASE_ALREADY_IN_PROGRESS');
      expect(error.statusCode).toBe(409);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        phase: SDLCPhase.TESTING,
        assignedAgentId: 'agent-456',
      });
    });

    it('should use 409 Conflict status for concurrent access', () => {
      // Arrange & Act
      const error = new PhaseAlreadyInProgressError(
        'project-123',
        SDLCPhase.ARCHITECTURE,
        'agent-789'
      );

      // Assert
      expect(error.statusCode).toBe(409);
    });
  });

  describe('PhaseArtifactsRequiredError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new PhaseArtifactsRequiredError(
        'project-123',
        SDLCPhase.REQUIREMENTS,
        ['requirements.md', 'user-stories.md']
      );

      // Assert
      expect(error.message).toBe(
        'Phase requirements requires artifacts: requirements.md, user-stories.md'
      );
      expect(error.code).toBe('PHASE_ARTIFACTS_REQUIRED');
      expect(error.statusCode).toBe(422);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        phase: SDLCPhase.REQUIREMENTS,
        requiredArtifacts: ['requirements.md', 'user-stories.md'],
      });
    });

    it('should handle single required artifact', () => {
      // Arrange & Act
      const error = new PhaseArtifactsRequiredError(
        'project-123',
        SDLCPhase.ARCHITECTURE,
        ['architecture.md']
      );

      // Assert
      expect(error.message).toContain('architecture.md');
      expect(error.metadata?.requiredArtifacts).toEqual(['architecture.md']);
    });

    it('should handle empty artifacts list', () => {
      // Arrange & Act
      const error = new PhaseArtifactsRequiredError(
        'project-123',
        SDLCPhase.DEVELOPMENT,
        []
      );

      // Assert
      expect(error.message).toContain('requires artifacts: ');
      expect(error.metadata?.requiredArtifacts).toEqual([]);
    });
  });

  describe('API Response formatting', () => {
    it('should format all phase errors for API responses', () => {
      // Arrange
      const errors = [
        new InvalidPhaseTransitionError('p1', SDLCPhase.REQUIREMENTS, PhaseStatus.PENDING, PhaseStatus.IN_PROGRESS),
        new PhasePrerequisiteError('p1', SDLCPhase.DEVELOPMENT, SDLCPhase.REQUIREMENTS, PhaseStatus.PENDING),
        new PhaseExecutionError('p1', SDLCPhase.TESTING, 'Failed'),
        new PhaseNotFoundError('p1', SDLCPhase.ARCHITECTURE),
        new PhaseAgentRequiredError('p1', SDLCPhase.SECURITY),
        new PhaseAlreadyInProgressError('p1', SDLCPhase.DEPLOYMENT, 'agent-1'),
        new PhaseArtifactsRequiredError('p1', SDLCPhase.ACCEPTANCE, ['test.md']),
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
    it('should identify phase errors correctly', () => {
      // Arrange
      const phaseError = new InvalidPhaseTransitionError(
        'p1',
        SDLCPhase.REQUIREMENTS,
        PhaseStatus.PENDING,
        PhaseStatus.IN_PROGRESS
      );
      const regularError = new Error('Regular error');

      // Act & Assert
      expect(SchedulingError.isSchedulingError(phaseError)).toBe(true);
      expect(SchedulingError.isSchedulingError(regularError)).toBe(false);
      expect(SchedulingError.isErrorCode(phaseError, 'INVALID_PHASE_TRANSITION')).toBe(true);
      expect(SchedulingError.isErrorCode(phaseError, 'OTHER_ERROR')).toBe(false);
    });
  });

  describe('Error serialization', () => {
    it('should serialize phase errors correctly', () => {
      // Arrange
      const error = new PhaseExecutionError(
        'project-123',
        SDLCPhase.DEVELOPMENT,
        'Compilation failed'
      );

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.code).toBe('PHASE_EXECUTION_FAILED');
      expect(json.statusCode).toBe(500);
      expect(json.message).toContain('Compilation failed');
      expect(json.metadata).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });
  });
});
