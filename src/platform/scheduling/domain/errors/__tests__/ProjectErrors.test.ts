/**
 * Tests for Project-related domain errors
 */

import {
  ProjectNotFoundError,
  ProjectAlreadyExistsError,
  InvalidProjectStateError,
  InvalidDeadlineError,
  ProjectValidationError,
  ProjectNameTooLongError,
  InvalidPhaseCountError,
} from '../ProjectErrors';
import { SchedulingError } from '../SchedulingError';

// Mock ProjectStatus enum to avoid uuid import issues
enum ProjectStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

describe('ProjectErrors', () => {
  describe('ProjectNotFoundError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new ProjectNotFoundError('project-123');

      // Assert
      expect(error.message).toBe('Project not found: project-123');
      expect(error.code).toBe('PROJECT_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.metadata).toEqual({ projectId: 'project-123' });
    });

    it('should be instance of SchedulingError', () => {
      // Arrange & Act
      const error = new ProjectNotFoundError('project-123');

      // Assert
      expect(error).toBeInstanceOf(SchedulingError);
      expect(error).toBeInstanceOf(ProjectNotFoundError);
    });

    it('should serialize correctly', () => {
      // Arrange
      const error = new ProjectNotFoundError('project-123');

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.code).toBe('PROJECT_NOT_FOUND');
      expect(json.statusCode).toBe(404);
      expect(json.metadata).toEqual({ projectId: 'project-123' });
    });
  });

  describe('ProjectAlreadyExistsError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new ProjectAlreadyExistsError('project-123', 'My Project');

      // Assert
      expect(error.message).toBe('Project already exists: My Project (project-123)');
      expect(error.code).toBe('PROJECT_ALREADY_EXISTS');
      expect(error.statusCode).toBe(409);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        projectName: 'My Project',
      });
    });

    it('should include both ID and name in metadata', () => {
      // Arrange & Act
      const error = new ProjectAlreadyExistsError('proj-456', 'Test Project');

      // Assert
      expect(error.metadata?.projectId).toBe('proj-456');
      expect(error.metadata?.projectName).toBe('Test Project');
    });
  });

  describe('InvalidProjectStateError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new InvalidProjectStateError(
        'project-123',
        'Cannot schedule project',
        ProjectStatus.COMPLETED,
        [ProjectStatus.DRAFT]
      );

      // Assert
      expect(error.message).toBe(
        "Cannot schedule project: Project is in state 'completed', expected one of: draft"
      );
      expect(error.code).toBe('INVALID_PROJECT_STATE');
      expect(error.statusCode).toBe(400);
      expect(error.metadata).toEqual({
        projectId: 'project-123',
        operation: 'Cannot schedule project',
        currentState: ProjectStatus.COMPLETED,
        expectedStates: [ProjectStatus.DRAFT],
      });
    });

    it('should handle multiple expected states', () => {
      // Arrange & Act
      const error = new InvalidProjectStateError(
        'project-123',
        'Cannot start project',
        ProjectStatus.FAILED,
        [ProjectStatus.SCHEDULED, ProjectStatus.DRAFT]
      );

      // Assert
      expect(error.message).toContain('scheduled, draft');
      expect(error.metadata?.expectedStates).toEqual([
        ProjectStatus.SCHEDULED,
        ProjectStatus.DRAFT,
      ]);
    });

    it('should be throwable and catchable', () => {
      // Arrange
      const throwError = () => {
        throw new InvalidProjectStateError(
          'project-123',
          'Test operation',
          ProjectStatus.CANCELLED,
          [ProjectStatus.IN_PROGRESS]
        );
      };

      // Act & Assert
      expect(throwError).toThrow(InvalidProjectStateError);
      expect(throwError).toThrow('Test operation');
    });
  });

  describe('InvalidDeadlineError', () => {
    it('should create error with correct properties', () => {
      // Arrange
      const deadline = new Date('2025-12-31');

      // Act
      const error = new InvalidDeadlineError(
        'Delivery date cannot be in the past',
        deadline
      );

      // Assert
      expect(error.message).toBe('Invalid deadline: Delivery date cannot be in the past');
      expect(error.code).toBe('INVALID_DEADLINE');
      expect(error.statusCode).toBe(422);
      expect(error.metadata).toEqual({
        reason: 'Delivery date cannot be in the past',
        deadline: '2025-12-31T00:00:00.000Z',
      });
    });

    it('should accept additional metadata', () => {
      // Arrange
      const deadline = new Date('2025-01-01');
      const metadata = {
        minDeadline: '2025-06-01',
        maxDeadline: '2026-12-31',
      };

      // Act
      const error = new InvalidDeadlineError('Date out of range', deadline, metadata);

      // Assert
      expect(error.metadata).toEqual({
        reason: 'Date out of range',
        deadline: '2025-01-01T00:00:00.000Z',
        minDeadline: '2025-06-01',
        maxDeadline: '2026-12-31',
      });
    });

    it('should serialize deadline as ISO string', () => {
      // Arrange
      const deadline = new Date('2025-06-15T10:30:00Z');

      // Act
      const error = new InvalidDeadlineError('Invalid date', deadline);
      const json = error.toJSON();

      // Assert
      expect(json.metadata?.deadline).toBe('2025-06-15T10:30:00.000Z');
    });
  });

  describe('ProjectValidationError', () => {
    it('should create error with message', () => {
      // Arrange & Act
      const error = new ProjectValidationError('Project name is required');

      // Assert
      expect(error.message).toBe('Project name is required');
      expect(error.code).toBe('PROJECT_VALIDATION_FAILED');
      expect(error.statusCode).toBe(422);
    });

    it('should accept metadata', () => {
      // Arrange & Act
      const error = new ProjectValidationError('Validation failed', {
        field: 'name',
        constraint: 'required',
      });

      // Assert
      expect(error.metadata).toEqual({
        field: 'name',
        constraint: 'required',
      });
    });

    it('should work without metadata', () => {
      // Arrange & Act
      const error = new ProjectValidationError('Simple validation error');

      // Assert
      expect(error.metadata).toBeUndefined();
    });
  });

  describe('ProjectNameTooLongError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new ProjectNameTooLongError(250, 200);

      // Assert
      expect(error.message).toBe(
        'Project name must be 200 characters or less (got 250)'
      );
      expect(error.code).toBe('PROJECT_NAME_TOO_LONG');
      expect(error.statusCode).toBe(422);
      expect(error.metadata).toEqual({
        actualLength: 250,
        maxLength: 200,
      });
    });

    it('should include both actual and max length', () => {
      // Arrange & Act
      const error = new ProjectNameTooLongError(500, 200);

      // Assert
      expect(error.metadata?.actualLength).toBe(500);
      expect(error.metadata?.maxLength).toBe(200);
    });
  });

  describe('InvalidPhaseCountError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new InvalidPhaseCountError(5, 7);

      // Assert
      expect(error.message).toBe(
        'Project must have exactly 7 SDLC phases (got 5)'
      );
      expect(error.code).toBe('INVALID_PHASE_COUNT');
      expect(error.statusCode).toBe(422);
      expect(error.metadata).toEqual({
        actualCount: 5,
        expectedCount: 7,
      });
    });

    it('should handle zero phases', () => {
      // Arrange & Act
      const error = new InvalidPhaseCountError(0, 7);

      // Assert
      expect(error.message).toContain('got 0');
      expect(error.metadata?.actualCount).toBe(0);
    });
  });

  describe('API Response formatting', () => {
    it('should format all project errors for API responses', () => {
      // Arrange
      const errors = [
        new ProjectNotFoundError('project-123'),
        new ProjectAlreadyExistsError('project-123', 'Test'),
        new InvalidProjectStateError('proj-1', 'op', ProjectStatus.DRAFT, []),
        new InvalidDeadlineError('reason', new Date()),
        new ProjectValidationError('validation'),
        new ProjectNameTooLongError(300, 200),
        new InvalidPhaseCountError(5, 7),
      ];

      // Act & Assert
      errors.forEach(error => {
        const response = error.toAPIResponse();
        expect(response.error).toHaveProperty('code');
        expect(response.error).toHaveProperty('message');
        expect(response.error).toHaveProperty('timestamp');
        expect(response.error).not.toHaveProperty('stack');
      });
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper inheritance chain', () => {
      // Arrange
      const error = new ProjectNotFoundError('project-123');

      // Act & Assert
      expect(error).toBeInstanceOf(ProjectNotFoundError);
      expect(error).toBeInstanceOf(SchedulingError);
      expect(error).toBeInstanceOf(Error);
    });
  });
});
