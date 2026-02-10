/**
 * Role-Based Access Control (RBAC) Middleware for Scheduling System
 *
 * Provides fine-grained authorization for project lifecycle endpoints.
 * Implements both role-based and permission-based access control.
 *
 * Authorization Strategy:
 * - Role-based: Coarse-grained access (admin, developer, operator, viewer)
 * - Permission-based: Fine-grained access (projects:create, projects:delete, etc.)
 *
 * Permission Format:
 * - resource:action (e.g., "projects:create", "phases:complete")
 * - Wildcard support: "projects:*" grants all project actions
 * - Admin wildcard: "*" grants all permissions
 *
 * @module scheduling/presentation/middleware/rbac
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from './auth';

// ===========================
// Type Definitions
// ===========================

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

/**
 * Authorization result
 */
interface AuthorizationResult {
  granted: boolean;
  reason?: string;
}

// ===========================
// Utility Functions
// ===========================

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
 * Check if user has specific permission
 *
 * Permission matching rules:
 * 1. Exact match: "projects:create" matches "projects:create"
 * 2. Wildcard permission: "projects:*" matches "projects:create"
 * 3. Admin wildcard: "*" matches everything
 *
 * @param userPermissions - Array of user's permissions
 * @param requiredPermission - Required permission to check
 * @returns true if user has permission
 */
function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  // Admin wildcard grants all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  // Exact permission match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Wildcard permission match (e.g., "projects:*" matches "projects:create")
  const [resource, _action] = requiredPermission.split(':');
  const wildcardPermission = `${resource}:*`;

  if (userPermissions.includes(wildcardPermission)) {
    return true;
  }

  return false;
}

/**
 * Check if user has any of the required permissions
 *
 * @param userPermissions - Array of user's permissions
 * @param requiredPermissions - Array of required permissions (OR logic)
 * @returns Authorization result
 */
function checkPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): AuthorizationResult {
  // Check if user has any of the required permissions
  const hasAnyPermission = requiredPermissions.some(permission =>
    hasPermission(userPermissions, permission)
  );

  if (hasAnyPermission) {
    return { granted: true };
  }

  return {
    granted: false,
    reason: `Required permission: ${requiredPermissions.join(' or ')}`,
  };
}

/**
 * Check if user has required role
 *
 * Role hierarchy (higher roles include lower role permissions):
 * admin > operator > developer > viewer
 *
 * @param userRole - User's role
 * @param allowedRoles - Array of allowed roles
 * @returns Authorization result
 */
function checkRole(userRole: UserRole, allowedRoles: UserRole[]): AuthorizationResult {
  if (allowedRoles.includes(userRole)) {
    return { granted: true };
  }

  return {
    granted: false,
    reason: `Required role: ${allowedRoles.join(' or ')}`,
  };
}

// ===========================
// Middleware Functions
// ===========================

/**
 * Role-Based Access Control Middleware
 *
 * Restricts endpoint access to specific user roles.
 *
 * Usage:
 * ```typescript
 * // Only admins can access
 * router.post('/scheduler/process', requireRole('admin'), handler);
 *
 * // Admins or developers can access
 * router.post('/projects', requireRole('admin', 'developer'), handler);
 * ```
 *
 * @param allowedRoles - One or more roles that are allowed to access the endpoint
 * @returns Express middleware function
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const traceId = req.traceId;

    // Ensure user is authenticated
    if (!req.user) {
      console.warn(`[RBAC:${traceId}] Authentication required but user not found`);
      return sendErrorResponse(
        res,
        401,
        'AUTH_REQUIRED',
        'Authentication required',
        traceId
      );
    }

    // Check role
    const result = checkRole(req.user.role, allowedRoles);

    if (!result.granted) {
      console.warn(`[RBAC:${traceId}] Authorization failed for user ${req.user.email}:`, {
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        reason: result.reason,
      });

      return sendErrorResponse(
        res,
        403,
        'INSUFFICIENT_PERMISSIONS',
        result.reason || 'Insufficient permissions',
        traceId
      );
    }

    console.log(`[RBAC:${traceId}] Role check passed for ${req.user.email} (${req.user.role})`);
    next();
  };
}

/**
 * Permission-Based Access Control Middleware
 *
 * Restricts endpoint access based on fine-grained permissions.
 *
 * Usage:
 * ```typescript
 * // Requires specific permission
 * router.post('/projects', requirePermission('projects:create'), handler);
 *
 * // Requires one of multiple permissions (OR logic)
 * router.get('/projects/:id',
 *   requirePermission('projects:read', 'projects:admin'),
 *   handler
 * );
 * ```
 *
 * @param requiredPermissions - One or more permissions required to access the endpoint
 * @returns Express middleware function
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const traceId = req.traceId;

    // Ensure user is authenticated
    if (!req.user) {
      console.warn(`[RBAC:${traceId}] Authentication required but user not found`);
      return sendErrorResponse(
        res,
        401,
        'AUTH_REQUIRED',
        'Authentication required',
        traceId
      );
    }

    // Check permissions
    const result = checkPermissions(req.user.permissions, requiredPermissions);

    if (!result.granted) {
      console.warn(`[RBAC:${traceId}] Permission denied for user ${req.user.email}:`, {
        userPermissions: req.user.permissions,
        requiredPermissions,
        reason: result.reason,
      });

      return sendErrorResponse(
        res,
        403,
        'PERMISSION_DENIED',
        result.reason || 'Permission denied',
        traceId
      );
    }

    console.log(`[RBAC:${traceId}] Permission check passed for ${req.user.email}`);
    next();
  };
}

/**
 * Admin-Only Access Middleware
 *
 * Shorthand middleware that restricts access to admin role only.
 * Useful for privileged operations like manual scheduler triggers.
 *
 * Usage:
 * ```typescript
 * router.post('/scheduler/process', requireAdmin, handler);
 * router.delete('/projects/:id', requireAdmin, handler);
 * ```
 *
 * @returns Express middleware function
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  return requireRole('admin')(req, res, next);
}

/**
 * Resource Owner or Admin Middleware
 *
 * Allows access if user is the resource owner OR has admin role.
 * Useful for operations where users can manage their own resources.
 *
 * Usage:
 * ```typescript
 * // User can cancel their own projects, or admin can cancel any
 * router.post('/projects/:id/cancel',
 *   requireOwnerOrAdmin('createdBy'),
 *   handler
 * );
 * ```
 *
 * @param ownerField - Field name in request body/params that contains owner ID
 * @returns Express middleware function
 */
export function requireOwnerOrAdmin(ownerField: string = 'createdBy') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const traceId = req.traceId;

    // Ensure user is authenticated
    if (!req.user) {
      console.warn(`[RBAC:${traceId}] Authentication required but user not found`);
      return sendErrorResponse(
        res,
        401,
        'AUTH_REQUIRED',
        'Authentication required',
        traceId
      );
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      console.log(`[RBAC:${traceId}] Admin access granted for ${req.user.email}`);
      return next();
    }

    // Check if user is the owner
    const ownerId = req.body[ownerField] || req.params[ownerField];

    if (!ownerId) {
      console.warn(`[RBAC:${traceId}] Owner field "${ownerField}" not found in request`);
      return sendErrorResponse(
        res,
        400,
        'BAD_REQUEST',
        `Missing ${ownerField} field`,
        traceId
      );
    }

    if (req.user.sub === ownerId) {
      console.log(`[RBAC:${traceId}] Owner access granted for ${req.user.email}`);
      return next();
    }

    // Not owner and not admin
    console.warn(`[RBAC:${traceId}] Access denied: User ${req.user.email} is not owner or admin`);
    return sendErrorResponse(
      res,
      403,
      'FORBIDDEN',
      'Access denied: You must be the resource owner or admin',
      traceId
    );
  };
}

/**
 * Combined Role and Permission Middleware
 *
 * Requires BOTH role AND permission (AND logic).
 * Useful for operations that need strict access control.
 *
 * Usage:
 * ```typescript
 * router.post('/projects/:id/phases/:phase/fail',
 *   requireRoleAndPermission(['admin', 'operator'], ['phases:manage']),
 *   handler
 * );
 * ```
 *
 * @param allowedRoles - Allowed roles
 * @param requiredPermissions - Required permissions
 * @returns Express middleware function
 */
export function requireRoleAndPermission(
  allowedRoles: UserRole[],
  requiredPermissions: string[]
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const traceId = req.traceId;

    // Ensure user is authenticated
    if (!req.user) {
      console.warn(`[RBAC:${traceId}] Authentication required but user not found`);
      return sendErrorResponse(
        res,
        401,
        'AUTH_REQUIRED',
        'Authentication required',
        traceId
      );
    }

    // Check role
    const roleResult = checkRole(req.user.role, allowedRoles);
    if (!roleResult.granted) {
      console.warn(`[RBAC:${traceId}] Role check failed for ${req.user.email}`);
      return sendErrorResponse(
        res,
        403,
        'INSUFFICIENT_PERMISSIONS',
        roleResult.reason || 'Insufficient permissions',
        traceId
      );
    }

    // Check permissions
    const permissionResult = checkPermissions(req.user.permissions, requiredPermissions);
    if (!permissionResult.granted) {
      console.warn(`[RBAC:${traceId}] Permission check failed for ${req.user.email}`);
      return sendErrorResponse(
        res,
        403,
        'PERMISSION_DENIED',
        permissionResult.reason || 'Permission denied',
        traceId
      );
    }

    console.log(`[RBAC:${traceId}] Combined role and permission check passed for ${req.user.email}`);
    next();
  };
}

// ===========================
// Export Convenience Functions
// ===========================

/**
 * Standard permission definitions for scheduling system
 */
export const PERMISSIONS = {
  // Project permissions
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_READ: 'projects:read',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  PROJECTS_LIST: 'projects:list',
  PROJECTS_ADMIN: 'projects:*',

  // Phase permissions
  PHASES_READ: 'phases:read',
  PHASES_COMPLETE: 'phases:complete',
  PHASES_FAIL: 'phases:fail',
  PHASES_MANAGE: 'phases:*',

  // Scheduler permissions
  SCHEDULER_TRIGGER: 'scheduler:trigger',
  SCHEDULER_VIEW: 'scheduler:view',
  SCHEDULER_ADMIN: 'scheduler:*',

  // Analytics permissions
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_ADMIN: 'analytics:*',

  // Admin permissions
  ALL: '*',
} as const;
