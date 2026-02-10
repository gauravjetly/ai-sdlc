/**
 * Tests for SchedulingError base class
 */

import { SchedulingError, SerializedError } from '../SchedulingError';

// Concrete implementation for testing abstract base class
class TestError extends SchedulingError {
  constructor(message: string) {
    super(message, 'TEST_ERROR', 500, { testData: 'value' });
  }
}

describe('SchedulingError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      // Arrange & Act
      const error = new TestError('Test error message');

      // Assert
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.metadata).toEqual({ testData: 'value' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('TestError');
      expect(error.stack).toBeDefined();
    });

    it('should set the correct prototype for instanceof checks', () => {
      // Arrange & Act
      const error = new TestError('Test message');

      // Assert
      expect(error).toBeInstanceOf(TestError);
      expect(error).toBeInstanceOf(SchedulingError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should capture stack trace', () => {
      // Arrange & Act
      const error = new TestError('Test message');

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestError');
      expect(error.stack).toContain('Test message');
    });
  });

  describe('toJSON', () => {
    it('should serialize error with stack trace in development', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const error = new TestError('Test message');

      // Act
      const json = error.toJSON();

      // Assert
      expect(json).toMatchObject({
        code: 'TEST_ERROR',
        message: 'Test message',
        statusCode: 500,
        metadata: { testData: 'value' },
      });
      expect(json.stack).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(new Date(json.timestamp)).toBeInstanceOf(Date);

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should serialize error without stack trace in production', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const error = new TestError('Test message');

      // Act
      const json = error.toJSON();

      // Assert
      expect(json).toMatchObject({
        code: 'TEST_ERROR',
        message: 'Test message',
        statusCode: 500,
        metadata: { testData: 'value' },
      });
      expect(json.stack).toBeUndefined();
      expect(json.timestamp).toBeDefined();

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should include ISO 8601 timestamp', () => {
      // Arrange
      const error = new TestError('Test message');

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('toAPIResponse', () => {
    it('should create API response object', () => {
      // Arrange
      const error = new TestError('Test message');

      // Act
      const response = error.toAPIResponse();

      // Assert
      expect(response).toEqual({
        error: {
          code: 'TEST_ERROR',
          message: 'Test message',
          details: { testData: 'value' },
          timestamp: error.timestamp.toISOString(),
        },
      });
    });

    it('should not include stack trace in API response', () => {
      // Arrange
      const error = new TestError('Test message');

      // Act
      const response = error.toAPIResponse();

      // Assert
      expect(response.error).not.toHaveProperty('stack');
    });
  });

  describe('isSchedulingError', () => {
    it('should return true for SchedulingError instances', () => {
      // Arrange
      const error = new TestError('Test message');

      // Act & Assert
      expect(SchedulingError.isSchedulingError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      // Arrange
      const error = new Error('Regular error');

      // Act & Assert
      expect(SchedulingError.isSchedulingError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      // Arrange
      const notError = { message: 'Not an error' };

      // Act & Assert
      expect(SchedulingError.isSchedulingError(notError)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      // Act & Assert
      expect(SchedulingError.isSchedulingError(null)).toBe(false);
      expect(SchedulingError.isSchedulingError(undefined)).toBe(false);
    });
  });

  describe('isErrorCode', () => {
    it('should return true for matching error code', () => {
      // Arrange
      const error = new TestError('Test message');

      // Act & Assert
      expect(SchedulingError.isErrorCode(error, 'TEST_ERROR')).toBe(true);
    });

    it('should return false for non-matching error code', () => {
      // Arrange
      const error = new TestError('Test message');

      // Act & Assert
      expect(SchedulingError.isErrorCode(error, 'OTHER_ERROR')).toBe(false);
    });

    it('should return false for non-SchedulingError', () => {
      // Arrange
      const error = new Error('Regular error');

      // Act & Assert
      expect(SchedulingError.isErrorCode(error, 'TEST_ERROR')).toBe(false);
    });
  });

  describe('error handling in try-catch', () => {
    it('should be catchable as Error', () => {
      // Arrange
      const throwError = () => {
        throw new TestError('Test message');
      };

      // Act & Assert
      expect(throwError).toThrow(Error);
      expect(throwError).toThrow('Test message');
    });

    it('should be catchable as TestError', () => {
      // Arrange
      const throwError = () => {
        throw new TestError('Test message');
      };

      // Act & Assert
      expect(throwError).toThrow(TestError);
    });

    it('should preserve error properties in catch block', () => {
      // Arrange
      try {
        throw new TestError('Test message');
      } catch (error) {
        // Assert
        expect(error).toBeInstanceOf(TestError);
        expect((error as TestError).code).toBe('TEST_ERROR');
        expect((error as TestError).statusCode).toBe(500);
        expect((error as TestError).metadata).toEqual({ testData: 'value' });
      }
    });
  });
});
