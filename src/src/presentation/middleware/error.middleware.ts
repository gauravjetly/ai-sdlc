import { Request, Response, NextFunction } from 'express';
import { DomainError, ValidationError } from '../../domain/errors';
import { logger } from '../../shared/utils/logger';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; code: string; message: string }>;
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as any).id;

  // Log the error
  logger.error({
    err,
    requestId,
    method: req.method,
    url: req.url,
  }, 'Request error');

  // Determine status code and error details
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: Array<{ field: string; code: string; message: string }> | undefined;

  if (err instanceof DomainError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;

    if (err instanceof ValidationError) {
      details = err.details;
    }
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }

  // Build error response
  const response: ErrorResponse = {
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  };

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
    },
  };

  res.status(404).json(response);
}
