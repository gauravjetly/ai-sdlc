/**
 * Error Handling Middleware
 * Global error handler for API routes
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ErrorHandler');

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public message: string,
    public details?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found handler - catches all 404 errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new ApiError(
    404,
    'ROUTE_NOT_FOUND',
    `Route ${req.method} ${req.path} not found`
  );
  next(error);
};

/**
 * Global error handler - catches all errors and returns standardized response
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any[] | undefined;

  // If it's our custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }

  // Log error details (full stack trace)
  logger.error('API Error', {
    statusCode,
    code,
    message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    error: err.stack,
    details
  });

  // Return safe error response to client
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      traceId: (req as any).traceId,
      timestamp: new Date().toISOString(),
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Common API error factories
 */
export const errors = {
  badRequest: (message: string, details?: any[]) =>
    new ApiError(400, 'BAD_REQUEST', message, details),

  unauthorized: (message: string = 'Authentication required') =>
    new ApiError(401, 'UNAUTHORIZED', message),

  forbidden: (message: string = 'Insufficient permissions') =>
    new ApiError(403, 'FORBIDDEN', message),

  notFound: (resource: string) =>
    new ApiError(404, 'NOT_FOUND', `${resource} not found`),

  conflict: (message: string) =>
    new ApiError(409, 'CONFLICT', message),

  unprocessableEntity: (message: string, details?: any[]) =>
    new ApiError(422, 'UNPROCESSABLE_ENTITY', message, details),

  tooManyRequests: (message: string = 'Rate limit exceeded') =>
    new ApiError(429, 'RATE_LIMIT_EXCEEDED', message),

  internalError: (message: string = 'Internal server error') =>
    new ApiError(500, 'INTERNAL_ERROR', message),

  serviceUnavailable: (message: string = 'Service temporarily unavailable') =>
    new ApiError(503, 'SERVICE_UNAVAILABLE', message),

  gatewayTimeout: (message: string = 'Gateway timeout') =>
    new ApiError(504, 'GATEWAY_TIMEOUT', message)
};
