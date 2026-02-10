/**
 * Base Error Class for Scheduling Domain
 *
 * All scheduling-related errors extend from this base class.
 * Provides consistent error structure with:
 * - Human-readable messages
 * - Machine-readable error codes
 * - HTTP status codes for API responses
 * - Optional metadata/context
 * - Stack traces (dev mode only)
 */

export interface ErrorMetadata {
  [key: string]: unknown;
}

export interface SerializedError {
  code: string;
  message: string;
  statusCode: number;
  metadata?: ErrorMetadata;
  stack?: string;
  timestamp: string;
}

/**
 * Base class for all scheduling domain errors.
 * Follows SOLID principles:
 * - Single Responsibility: Error representation only
 * - Open/Closed: Extensible via inheritance
 * - Liskov Substitution: All subclasses are substitutable
 */
export abstract class SchedulingError extends Error {
  /**
   * Machine-readable error code (e.g., 'PROJECT_NOT_FOUND')
   */
  public readonly code: string;

  /**
   * HTTP status code for API responses
   */
  public readonly statusCode: number;

  /**
   * Additional context/metadata about the error
   */
  public readonly metadata?: ErrorMetadata;

  /**
   * Timestamp when error was created
   */
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    metadata?: ErrorMetadata
  ) {
    super(message);

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;
    this.timestamp = new Date();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for logging and API responses.
   * Stack traces included only in development mode.
   */
  toJSON(): SerializedError {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      metadata: this.metadata,
      stack: isDevelopment ? this.stack : undefined,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Create API response object for error
   */
  toAPIResponse(): {
    error: {
      code: string;
      message: string;
      details?: ErrorMetadata;
      timestamp: string;
    };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.metadata,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }

  /**
   * Check if error is a scheduling domain error
   */
  static isSchedulingError(error: unknown): error is SchedulingError {
    return error instanceof SchedulingError;
  }

  /**
   * Check if error is a specific error type
   */
  static isErrorCode(error: unknown, code: string): boolean {
    return this.isSchedulingError(error) && error.code === code;
  }
}
