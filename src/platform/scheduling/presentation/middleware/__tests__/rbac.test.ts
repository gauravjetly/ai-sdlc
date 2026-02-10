/**
 * Unit Tests for Role-Based Access Control (RBAC) Middleware
 *
 * Tests:
 * - Role-based authorization
 * - Permission-based authorization
 * - Wildcard permission matching
 * - Admin role privileges
 * - Error handling and responses
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, JwtPayload } from '../auth';
import {
  requireRole,
  requirePermission,
  requireAdmin,
  requireOwnerOrAdmin,
  requireRoleAndPermission,
  PERMISSIONS,
} from '../rbac';

describe('RBAC Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock response
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      traceId: 'test-trace-123',
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  describe('requireRole', () => {
    it('should allow access when user has required role', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['*'],
        iat: 0,
        exp: 0,
      };

      const middleware = requireRole('admin');

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:create'],
        iat: 0,
        exp: 0,
      };

      const middleware = requireRole('admin', 'developer');

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access when user does not have required role', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['projects:read'],
        iat: 0,
        exp: 0,
      };

      const middleware = requireRole('admin');

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: expect.stringContaining('admin'),
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      // Arrange
      mockReq.user = undefined;

      const middleware = requireRole('admin');

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'AUTH_REQUIRED',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow access when user has exact permission', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:create', 'projects:read'],
        iat: 0,
        exp: 0,
      };

      const middleware = requirePermission(PERMISSIONS.PROJECTS_CREATE);

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access when user has wildcard permission', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:*'], // Wildcard for all project actions
        iat: 0,
        exp: 0,
      };

      const middleware = requirePermission(PERMISSIONS.PROJECTS_CREATE);

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access when user has admin wildcard', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['*'], // Admin has all permissions
        iat: 0,
        exp: 0,
      };

      const middleware = requirePermission(PERMISSIONS.PROJECTS_DELETE);

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple required permissions', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:read'], // Has read but not admin
        iat: 0,
        exp: 0,
      };

      const middleware = requirePermission(
        PERMISSIONS.PROJECTS_READ,
        PERMISSIONS.PROJECTS_ADMIN
      );

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access when user does not have required permission', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['projects:read'], // Read only, not delete
        iat: 0,
        exp: 0,
      };

      const middleware = requirePermission(PERMISSIONS.PROJECTS_DELETE);

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'PERMISSION_DENIED',
          message: expect.stringContaining('projects:delete'),
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      // Arrange
      mockReq.user = undefined;

      const middleware = requirePermission(PERMISSIONS.PROJECTS_CREATE);

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'AUTH_REQUIRED',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin users', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['*'],
        iat: 0,
        exp: 0,
      };

      // Act
      requireAdmin(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin users', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'dev@example.com',
        role: 'developer',
        permissions: ['projects:*'],
        iat: 0,
        exp: 0,
      };

      // Act
      requireAdmin(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnerOrAdmin', () => {
    it('should allow access for resource owner', async () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'owner@example.com',
        role: 'developer',
        permissions: ['projects:create'],
        iat: 0,
        exp: 0,
      };

      mockReq.body = {
        createdBy: 'user-123',
      };

      const middleware = requireOwnerOrAdmin();

      // Act
      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access for admin even if not owner', async () => {
      // Arrange
      mockReq.user = {
        sub: 'admin-456',
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['*'],
        iat: 0,
        exp: 0,
      };

      mockReq.body = {
        createdBy: 'user-123', // Different user
      };

      const middleware = requireOwnerOrAdmin();

      // Act
      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access for non-owner non-admin', async () => {
      // Arrange
      mockReq.user = {
        sub: 'user-789',
        email: 'other@example.com',
        role: 'developer',
        permissions: ['projects:read'],
        iat: 0,
        exp: 0,
      };

      mockReq.body = {
        createdBy: 'user-123', // Different user
      };

      const middleware = requireOwnerOrAdmin();

      // Act
      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          message: expect.stringContaining('owner or admin'),
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom owner field name', async () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'owner@example.com',
        role: 'developer',
        permissions: ['projects:read'],
        iat: 0,
        exp: 0,
      };

      mockReq.body = {};
      mockReq.params = {
        userId: 'user-123',
      };

      const middleware = requireOwnerOrAdmin('userId');

      // Act
      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('requireRoleAndPermission', () => {
    it('should allow access when user has both role and permission', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'operator@example.com',
        role: 'operator',
        permissions: ['phases:manage'],
        iat: 0,
        exp: 0,
      };

      const middleware = requireRoleAndPermission(
        ['admin', 'operator'],
        ['phases:manage']
      );

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access when user has role but not permission', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'operator@example.com',
        role: 'operator',
        permissions: ['phases:read'], // Has role but not manage permission
        iat: 0,
        exp: 0,
      };

      const middleware = requireRoleAndPermission(
        ['admin', 'operator'],
        ['phases:manage']
      );

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'PERMISSION_DENIED',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user has permission but not role', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'dev@example.com',
        role: 'developer', // Wrong role
        permissions: ['phases:manage'], // Has permission
        iat: 0,
        exp: 0,
      };

      const middleware = requireRoleAndPermission(
        ['admin', 'operator'],
        ['phases:manage']
      );

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Permission Constants', () => {
    it('should have all required permission constants defined', () => {
      expect(PERMISSIONS.PROJECTS_CREATE).toBe('projects:create');
      expect(PERMISSIONS.PROJECTS_READ).toBe('projects:read');
      expect(PERMISSIONS.PROJECTS_UPDATE).toBe('projects:update');
      expect(PERMISSIONS.PROJECTS_DELETE).toBe('projects:delete');
      expect(PERMISSIONS.PROJECTS_LIST).toBe('projects:list');
      expect(PERMISSIONS.PROJECTS_ADMIN).toBe('projects:*');
      expect(PERMISSIONS.PHASES_READ).toBe('phases:read');
      expect(PERMISSIONS.PHASES_COMPLETE).toBe('phases:complete');
      expect(PERMISSIONS.PHASES_FAIL).toBe('phases:fail');
      expect(PERMISSIONS.PHASES_MANAGE).toBe('phases:*');
      expect(PERMISSIONS.SCHEDULER_TRIGGER).toBe('scheduler:trigger');
      expect(PERMISSIONS.SCHEDULER_VIEW).toBe('scheduler:view');
      expect(PERMISSIONS.SCHEDULER_ADMIN).toBe('scheduler:*');
      expect(PERMISSIONS.ANALYTICS_VIEW).toBe('analytics:view');
      expect(PERMISSIONS.ANALYTICS_ADMIN).toBe('analytics:*');
      expect(PERMISSIONS.ALL).toBe('*');
    });
  });

  describe('Security', () => {
    it('should include trace ID in error responses', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: ['projects:read'],
        iat: 0,
        exp: 0,
      };

      const middleware = requireRole('admin');

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          traceId: 'test-trace-123',
        }),
      });
    });

    it('should include timestamp in error responses', () => {
      // Arrange
      mockReq.user = {
        sub: 'user-123',
        email: 'viewer@example.com',
        role: 'viewer',
        permissions: [],
        iat: 0,
        exp: 0,
      };

      const middleware = requirePermission(PERMISSIONS.PROJECTS_DELETE);

      // Act
      middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
      });
    });
  });
});
