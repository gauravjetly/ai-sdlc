/**
 * Authentication Middleware
 * JWT RS256 authentication with RBAC
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { JwtPayload, AuthenticatedRequest, UserRole } from '../types/api-types.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('AuthMiddleware');

// Load public key for JWT verification
const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(process.cwd(), 'keys', 'public.key');
let publicKey: string;

try {
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (error) {
  logger.error('Failed to load JWT public key', { error, path: publicKeyPath });
  // For development, generate a warning
  if (process.env.NODE_ENV === 'development') {
    logger.warn('Running without JWT authentication (DEVELOPMENT MODE)');
  } else {
    throw new Error('JWT public key not found. Run setup script to generate keys.');
  }
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // Skip auth in development if JWT keys not set up
  if (process.env.NODE_ENV === 'development' && !publicKey) {
    req.user = {
      sub: 'dev-user',
      email: 'dev@example.com',
      role: 'admin',
      permissions: ['*'],
      iat: Date.now(),
      exp: Date.now() + 3600000
    };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'No authorization header provided',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_AUTH_FORMAT',
        message: 'Authorization header must be: Bearer <token>',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256']
    }) as JwtPayload;

    req.user = decoded;
    logger.debug('User authenticated', { userId: decoded.sub, role: decoded.role });
    next();
  } catch (error: any) {
    logger.warn('JWT verification failed', { error: error.message });

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'JWT token has expired',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid JWT token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Role-based access control
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.sub,
        role: req.user.role,
        requiredRoles: allowedRoles
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required role: ${allowedRoles.join(' or ')}`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based access control (fine-grained)
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const hasPermission = requiredPermissions.some(permission => {
      // Admin has all permissions
      if (req.user!.permissions.includes('*')) {
        return true;
      }

      // Check exact permission
      if (req.user!.permissions.includes(permission)) {
        return true;
      }

      // Check wildcard permission (e.g., "deployments:*" matches "deployments:create")
      const [resource, action] = permission.split(':');
      const wildcardPermission = `${resource}:*`;
      return req.user!.permissions.includes(wildcardPermission);
    });

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.sub,
        userPermissions: req.user.permissions,
        requiredPermissions
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Required permission: ${requiredPermissions.join(' or ')}`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  authenticateJWT(req, res, next);
};
