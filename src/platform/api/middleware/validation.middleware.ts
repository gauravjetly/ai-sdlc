/**
 * Request Validation Middleware
 * Joi-based validation for request body, params, and query
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ValidationMiddleware');

export type ValidationType = 'body' | 'params' | 'query';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: Joi.Schema, type: ValidationType = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = type === 'body' ? req.body : type === 'params' ? req.params : req.query;

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: true // Remove unknown properties
    });

    if (error) {
      logger.warn('Validation failed', {
        type,
        errors: error.details,
        data: dataToValidate
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            code: detail.type,
            message: detail.message
          })),
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Replace the original data with validated/sanitized data
    if (type === 'body') {
      req.body = value;
    } else if (type === 'params') {
      req.params = value;
    } else {
      req.query = value;
    }

    next();
  };
};

/**
 * Validate multiple parts of the request
 */
export const validateAll = (schemas: {
  body?: Joi.Schema;
  params?: Joi.Schema;
  query?: Joi.Schema;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors: any[] = [];

    // Validate body
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        errors.push(...error.details.map(d => ({ ...d, location: 'body' })));
      } else {
        req.body = value;
      }
    }

    // Validate params
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        errors.push(...error.details.map(d => ({ ...d, location: 'params' })));
      } else {
        req.params = value;
      }
    }

    // Validate query
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        errors.push(...error.details.map(d => ({ ...d, location: 'query' })));
      } else {
        req.query = value;
      }
    }

    if (errors.length > 0) {
      logger.warn('Multi-part validation failed', { errors });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details: errors.map(detail => ({
            location: detail.location,
            field: detail.path.join('.'),
            code: detail.type,
            message: detail.message
          })),
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

// Common validation patterns
export const commonSchemas = {
  id: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(3).max(100),
  uuid: Joi.string().uuid(),
  email: Joi.string().email(),
  url: Joi.string().uri(),
  semver: Joi.string().pattern(/^\d+\.\d+\.\d+$/),
  environment: Joi.string().valid('dev', 'uat', 'prod', 'dr'),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
  }),
  tags: Joi.object().pattern(
    Joi.string().min(1).max(50),
    Joi.string().min(1).max(200)
  )
};
