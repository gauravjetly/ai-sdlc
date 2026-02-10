/**
 * Unit Tests for JWT Authentication Middleware
 *
 * Tests:
 * - Token validation (valid, expired, invalid)
 * - Token extraction from Authorization header
 * - Development mode bypass
 * - Error handling and responses
 * - Security: No sensitive data leakage
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticateJWT,
  optionalAuth,
  AuthenticatedRequest,
  JwtPayload,
} from '../auth';

// Mock jwt module
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
  decode: jest.fn(),
}));
const mockJwt = jwt as any;

// Mock fs module for public key loading
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'mock-public-key'),
}));

describe('JWT Authentication Middleware', () => {
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
      headers: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  describe('authenticateJWT', () => {
    describe('Valid Token', () => {
      it('should authenticate user with valid JWT token', () => {
        // Arrange
        const validPayload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'developer',
          permissions: ['projects:create', 'projects:read'],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        mockReq.headers = {
          authorization: 'Bearer valid-token',
        };

        mockJwt.verify.mockReturnValue(validPayload);

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(mockJwt.verify).toHaveBeenCalledWith(
          'valid-token',
          expect.any(String),
          { algorithms: ['RS256'] }
        );
        expect(mockReq.user).toEqual(validPayload);
        expect(mockReq.traceId).toBeDefined();
        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should attach trace ID to request', () => {
        // Arrange
        const validPayload: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['*'],
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        mockReq.headers = {
          authorization: 'Bearer valid-token',
        };

        mockJwt.verify.mockReturnValue(validPayload);

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(mockReq.traceId).toMatch(/^trace-\d+-[a-z0-9]+$/);
      });
    });

    describe('Missing Authorization Header', () => {
      it('should return 401 when no authorization header provided', () => {
        // Arrange
        mockReq.headers = {};

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            code: 'AUTH_REQUIRED',
            message: expect.stringContaining('authorization'),
            timestamp: expect.any(String),
            traceId: expect.any(String),
          }),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Invalid Authorization Header Format', () => {
      it('should return 401 for malformed authorization header', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'InvalidFormat',
        };

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            code: 'AUTH_REQUIRED',
            message: expect.stringContaining('format'),
          }),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 when scheme is not Bearer', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'Basic dXNlcjpwYXNz',
        };

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            code: 'AUTH_REQUIRED',
            message: expect.stringContaining('Bearer'),
          }),
        });
      });

      it('should return 401 when token is empty', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'Bearer ',
        };

        // Act
        authenticateJWT(
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
      });
    });

    describe('Token Verification Errors', () => {
      it('should return 401 for expired token', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'Bearer expired-token',
        };

        const expiredError = new Error('jwt expired');
        expiredError.name = 'TokenExpiredError';
        mockJwt.verify.mockImplementation(() => {
          throw expiredError;
        });

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            code: 'TOKEN_EXPIRED',
            message: expect.stringContaining('expired'),
          }),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 for invalid token signature', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'Bearer invalid-token',
        };

        const invalidError = new Error('invalid signature');
        invalidError.name = 'JsonWebTokenError';
        mockJwt.verify.mockImplementation(() => {
          throw invalidError;
        });

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid JWT token',
          }),
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 for not-before error', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'Bearer not-active-token',
        };

        const notBeforeError = new Error('jwt not active');
        notBeforeError.name = 'NotBeforeError';
        mockJwt.verify.mockImplementation(() => {
          throw notBeforeError;
        });

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            code: 'TOKEN_NOT_ACTIVE',
          }),
        });
      });

      it('should return 403 for generic verification error', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'Bearer bad-token',
        };

        mockJwt.verify.mockImplementation(() => {
          throw new Error('Generic error');
        });

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            code: 'AUTH_FAILED',
            message: 'Authentication failed',
          }),
        });
      });
    });

    describe('Security', () => {
      it('should not leak sensitive information in error messages', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'Bearer invalid-token',
        };

        mockJwt.verify.mockImplementation(() => {
          throw new Error('Detailed internal error with sensitive data');
        });

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            code: 'AUTH_FAILED',
            message: 'Authentication failed', // Generic message only
          }),
        });

        // Ensure the detailed error is NOT in the response
        const response = jsonMock.mock.calls[0][0];
        expect(JSON.stringify(response)).not.toContain('sensitive data');
        expect(JSON.stringify(response)).not.toContain('Detailed internal error');
      });

      it('should include timestamp in error responses', () => {
        // Arrange
        mockReq.headers = {};

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(jsonMock).toHaveBeenCalledWith({
          error: expect.objectContaining({
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO 8601 format
          }),
        });
      });

      it('should use RS256 algorithm for JWT verification', () => {
        // Arrange
        mockReq.headers = {
          authorization: 'Bearer token',
        };

        mockJwt.verify.mockReturnValue({
          sub: 'user-123',
          email: 'test@example.com',
          role: 'developer',
          permissions: [],
          iat: 0,
          exp: 0,
        });

        // Act
        authenticateJWT(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );

        // Assert
        expect(mockJwt.verify).toHaveBeenCalledWith(
          'token',
          expect.any(String),
          { algorithms: ['RS256'] } // Must use asymmetric RS256
        );
      });
    });
  });

  describe('optionalAuth', () => {
    it('should continue without authentication when no header provided', () => {
      // Arrange
      mockReq.headers = {};

      // Act
      optionalAuth(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should authenticate when valid header provided', () => {
      // Arrange
      const validPayload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'developer',
        permissions: ['projects:read'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify.mockReturnValue(validPayload);

      // Act
      optionalAuth(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(mockReq.user).toEqual(validPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when invalid header provided', () => {
      // Arrange
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      optionalAuth(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Assert
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
