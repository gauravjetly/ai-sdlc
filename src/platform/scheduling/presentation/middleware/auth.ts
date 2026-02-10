/**
 * JWT Authentication Middleware for Scheduling System
 *
 * Provides JWT token validation and user authentication for project lifecycle endpoints.
 * Integrates with the platform's existing RS256 JWT authentication system.
 *
 * Security Features:
 * - RS256 asymmetric key verification
 * - Token expiration validation
 * - Secure error handling (no sensitive data leakage)
 * - Development mode fallback
 *
 * @module scheduling/presentation/middleware/auth
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

// ===========================
// Type Definitions
// ===========================

/**
 * User roles supported by the scheduling system
 */
export type UserRole = 'admin' | 'developer' | 'viewer' | 'operator';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string;           // User ID
  email: string;         // User email
  role: UserRole;        // User role
  permissions: string[]; // Granular permissions
  iat: number;           // Issued at (timestamp)
  exp: number;           // Expiration (timestamp)
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  traceId?: string;
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    traceId?: string;
    timestamp: string;
  };
}

// ===========================
// Configuration
// ===========================

/**
 * Load JWT public key for RS256 verification
 * Key path can be configured via JWT_PUBLIC_KEY_PATH environment variable
 */
const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(process.cwd(), 'keys', 'public.key');
let publicKey: string | null = null;

try {
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  console.log(`[Auth] Loaded JWT public key from: ${publicKeyPath}`);
} catch (error) {
  console.warn(`[Auth] Failed to load JWT public key from: ${publicKeyPath}`);

  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'JWT public key not found. Run "npm run setup:jwt" to generate keys or set JWT_PUBLIC_KEY_PATH environment variable.'
    );
  }

  console.warn('[Auth] Running in DEVELOPMENT mode without JWT authentication');
}

// ===========================
// Utility Functions
// ===========================

/**
 * Generate a unique trace ID for request tracking
 */
function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Send standardized error response
 */
function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  traceId?: string
): void {
  const response: ErrorResponse = {
    error: {
      code,
      message,
      traceId,
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(response);
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader: string | undefined): { token: string | null; error: string | null } {
  if (!authHeader) {
    return { token: null, error: 'No authorization header provided' };
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return { token: null, error: 'Invalid authorization header format' };
  }

  const [scheme, token] = parts;

  if (scheme !== 'Bearer') {
    return { token: null, error: 'Authorization header must use Bearer scheme' };
  }

  if (!token || token.trim() === '') {
    return { token: null, error: 'Token is empty' };
  }

  return { token, error: null };
}

// ===========================
// Middleware Functions
// ===========================

/**
 * JWT Authentication Middleware
 *
 * Validates JWT token and attaches decoded user info to request object.
 *
 * Usage:
 * ```typescript
 * router.get('/projects', authenticateJWT, (req, res) => {
 *   const userId = req.user.sub;
 *   // ... handle request
 * });
 * ```
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const traceId = generateTraceId();
  req.traceId = traceId;

  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && !publicKey) {
    console.warn(`[Auth:${traceId}] Using development mode authentication bypass`);

    req.user = {
      sub: 'dev-user',
      email: 'dev@example.com',
      role: 'admin',
      permissions: ['*'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    return next();
  }

  // Extract token from Authorization header
  const { token, error: extractError } = extractToken(req.headers.authorization);

  if (extractError || !token) {
    console.warn(`[Auth:${traceId}] Authentication failed: ${extractError}`);
    return sendErrorResponse(
      res,
      401,
      'AUTH_REQUIRED',
      extractError || 'Authentication required',
      traceId
    );
  }

  // Verify JWT token
  try {
    if (!publicKey) {
      throw new Error('JWT public key not loaded');
    }

    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
    }) as JwtPayload;

    // Validate required fields
    if (!decoded.sub || !decoded.email || !decoded.role) {
      throw new Error('Invalid token payload: missing required fields');
    }

    // Attach user to request
    req.user = decoded;

    console.log(`[Auth:${traceId}] User authenticated: ${decoded.email} (${decoded.role})`);
    next();

  } catch (error: any) {
    console.error(`[Auth:${traceId}] JWT verification failed:`, error.message);

    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return sendErrorResponse(
        res,
        401,
        'TOKEN_EXPIRED',
        'JWT token has expired. Please obtain a new token.',
        traceId
      );
    }

    if (error.name === 'JsonWebTokenError') {
      return sendErrorResponse(
        res,
        403,
        'INVALID_TOKEN',
        'Invalid JWT token',
        traceId
      );
    }

    if (error.name === 'NotBeforeError') {
      return sendErrorResponse(
        res,
        401,
        'TOKEN_NOT_ACTIVE',
        'Token not yet active',
        traceId
      );
    }

    // Generic error
    return sendErrorResponse(
      res,
      403,
      'AUTH_FAILED',
      'Authentication failed',
      traceId
    );
  }
}

/**
 * Optional Authentication Middleware
 *
 * Validates JWT token if provided, but doesn't fail if no token exists.
 * Useful for endpoints that work differently for authenticated vs anonymous users.
 *
 * Usage:
 * ```typescript
 * router.get('/public-projects', optionalAuth, (req, res) => {
 *   const isAuthenticated = !!req.user;
 *   // ... handle request
 * });
 * ```
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // If no authorization header, continue without authentication
  if (!req.headers.authorization) {
    return next();
  }

  // If authorization header exists, validate it
  authenticateJWT(req, res, next);
}

/**
 * Require Authentication Middleware (Alias)
 *
 * Explicit alias for authenticateJWT to make intent clear in route definitions.
 *
 * Usage:
 * ```typescript
 * router.post('/projects', requireAuth, (req, res) => {
 *   // Only authenticated users reach here
 * });
 * ```
 */
export const requireAuth = authenticateJWT;
