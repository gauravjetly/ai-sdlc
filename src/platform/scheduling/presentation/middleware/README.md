# Authentication and Authorization Middleware

This directory contains JWT-based authentication and role-based access control (RBAC) middleware for the scheduling system API.

## Overview

The middleware implements a secure, production-ready authentication and authorization system with:

- **JWT Authentication**: RS256 asymmetric key verification
- **Role-Based Access Control (RBAC)**: Coarse-grained access by user role
- **Permission-Based Authorization**: Fine-grained access by specific permissions
- **Development Mode**: Fallback for local development without keys
- **Security Best Practices**: No sensitive data leakage, proper error handling

## Files

```
middleware/
├── auth.ts                 # JWT authentication middleware
├── rbac.ts                 # Role-based and permission-based authorization
├── README.md               # This file
└── __tests__/
    ├── auth.test.ts        # Authentication tests (>90% coverage)
    └── rbac.test.ts        # Authorization tests (>90% coverage)
```

## Quick Start

### 1. Setup JWT Keys

Generate RS256 key pair:

```bash
cd /path/to/platform
npm run setup:jwt
```

This creates:
- `keys/private.key` - For signing tokens (keep secret!)
- `keys/public.key` - For verifying tokens (used by middleware)

### 2. Environment Variables

```bash
# Optional: Custom public key path
export JWT_PUBLIC_KEY_PATH=/path/to/public.key

# Development mode (bypasses auth if keys not found)
export NODE_ENV=development
```

### 3. Use in Routes

```typescript
import { Router } from 'express';
import { requireAuth, requirePermission, requireAdmin } from './middleware/auth';
import { PERMISSIONS } from './middleware/rbac';

const router = Router();

// Public endpoint (no auth)
router.get('/dashboard', handler);

// Authenticated endpoint
router.get('/projects', requireAuth, handler);

// Permission-based endpoint
router.post('/projects',
  requireAuth,
  requirePermission(PERMISSIONS.PROJECTS_CREATE),
  handler
);

// Admin-only endpoint
router.post('/scheduler/process', requireAuth, requireAdmin, handler);
```

## Authentication

### JWT Token Format

**Header:**
```
Authorization: Bearer <jwt-token>
```

**JWT Payload:**
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "role": "developer",
  "permissions": ["projects:create", "projects:read"],
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Middleware Functions

#### `authenticateJWT`

Validates JWT token and attaches user info to request.

```typescript
import { authenticateJWT, AuthenticatedRequest } from './middleware/auth';

router.get('/projects',
  authenticateJWT,
  (req: AuthenticatedRequest, res) => {
    const userId = req.user.sub;
    const email = req.user.email;
    // ... handle request
  }
);
```

**Behavior:**
- ✅ Validates JWT signature using RS256 public key
- ✅ Checks token expiration
- ✅ Attaches `user` and `traceId` to request
- ✅ Returns 401 if authentication fails
- ✅ Returns 403 if token is invalid

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | AUTH_REQUIRED | No authorization header |
| 401 | TOKEN_EXPIRED | JWT token expired |
| 401 | TOKEN_NOT_ACTIVE | Token not yet active (nbf) |
| 403 | INVALID_TOKEN | Invalid JWT signature |
| 403 | AUTH_FAILED | Generic authentication failure |

#### `optionalAuth`

Validates token if provided, continues without error if missing.

```typescript
import { optionalAuth } from './middleware/auth';

router.get('/public-projects',
  optionalAuth,
  (req: AuthenticatedRequest, res) => {
    if (req.user) {
      // User is authenticated
    } else {
      // User is anonymous
    }
  }
);
```

#### `requireAuth`

Alias for `authenticateJWT` with explicit naming.

```typescript
import { requireAuth } from './middleware/auth';

router.post('/projects', requireAuth, handler);
```

## Authorization

### User Roles

The system supports four hierarchical roles:

| Role | Description | Typical Use Case |
|------|-------------|------------------|
| `admin` | Full system access | Platform administrators |
| `operator` | Operations and lifecycle management | DevOps engineers |
| `developer` | Create and manage projects | Software developers |
| `viewer` | Read-only access | Stakeholders, auditors |

### Permissions

Permissions follow the format: `resource:action`

**Permission Examples:**
- `projects:create` - Create new projects
- `projects:read` - View project details
- `projects:update` - Modify projects
- `projects:delete` - Delete projects
- `projects:*` - All project actions (wildcard)
- `*` - All permissions (admin wildcard)

**Available Permissions:**

```typescript
import { PERMISSIONS } from './middleware/rbac';

PERMISSIONS.PROJECTS_CREATE    // 'projects:create'
PERMISSIONS.PROJECTS_READ      // 'projects:read'
PERMISSIONS.PROJECTS_UPDATE    // 'projects:update'
PERMISSIONS.PROJECTS_DELETE    // 'projects:delete'
PERMISSIONS.PROJECTS_LIST      // 'projects:list'
PERMISSIONS.PROJECTS_ADMIN     // 'projects:*'

PERMISSIONS.PHASES_READ        // 'phases:read'
PERMISSIONS.PHASES_COMPLETE    // 'phases:complete'
PERMISSIONS.PHASES_FAIL        // 'phases:fail'
PERMISSIONS.PHASES_MANAGE      // 'phases:*'

PERMISSIONS.SCHEDULER_TRIGGER  // 'scheduler:trigger'
PERMISSIONS.SCHEDULER_VIEW     // 'scheduler:view'
PERMISSIONS.SCHEDULER_ADMIN    // 'scheduler:*'

PERMISSIONS.ANALYTICS_VIEW     // 'analytics:view'
PERMISSIONS.ANALYTICS_ADMIN    // 'analytics:*'

PERMISSIONS.ALL                // '*'
```

### Middleware Functions

#### `requireRole(...roles)`

Restrict access to specific roles (OR logic).

```typescript
import { requireRole } from './middleware/rbac';

// Admin only
router.post('/scheduler/process',
  requireAuth,
  requireRole('admin'),
  handler
);

// Admin OR operator
router.post('/projects/:id/cancel',
  requireAuth,
  requireRole('admin', 'operator'),
  handler
);
```

#### `requirePermission(...permissions)`

Restrict access by permission (OR logic).

```typescript
import { requirePermission, PERMISSIONS } from './middleware/rbac';

// Single permission
router.post('/projects',
  requireAuth,
  requirePermission(PERMISSIONS.PROJECTS_CREATE),
  handler
);

// Multiple permissions (OR)
router.get('/projects/:id',
  requireAuth,
  requirePermission(
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_ADMIN
  ),
  handler
);
```

**Permission Matching Rules:**

1. **Exact match**: `projects:create` matches `projects:create`
2. **Wildcard**: `projects:*` matches `projects:create`, `projects:read`, etc.
3. **Admin wildcard**: `*` matches everything

#### `requireAdmin`

Shorthand for admin-only access.

```typescript
import { requireAdmin } from './middleware/rbac';

router.delete('/projects/:id', requireAuth, requireAdmin, handler);
```

#### `requireOwnerOrAdmin(ownerField)`

Allow access if user is resource owner OR admin.

```typescript
import { requireOwnerOrAdmin } from './middleware/rbac';

// User can cancel their own projects, admin can cancel any
router.post('/projects/:id/cancel',
  requireAuth,
  requireOwnerOrAdmin('createdBy'),
  handler
);
```

**Behavior:**
- ✅ Allows admin users regardless of ownership
- ✅ Allows resource owner (matches user ID with field value)
- ✅ Denies all other users

#### `requireRoleAndPermission(roles, permissions)`

Require BOTH role AND permission (AND logic).

```typescript
import { requireRoleAndPermission, PERMISSIONS } from './middleware/rbac';

// Must be admin/operator AND have phase management permission
router.post('/projects/:id/phases/:phase/fail',
  requireAuth,
  requireRoleAndPermission(
    ['admin', 'operator'],
    [PERMISSIONS.PHASES_MANAGE]
  ),
  handler
);
```

## Route Security Examples

### Example 1: Public Dashboard

```typescript
// No authentication required
router.get('/dashboard', async (req, res) => {
  const dashboard = await getDashboard();
  res.json(dashboard);
});
```

### Example 2: Create Project

```typescript
// Requires authentication + projects:create permission
router.post('/',
  requireAuth,
  requirePermission(PERMISSIONS.PROJECTS_CREATE),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user.sub;
    const project = await createProject({ ...req.body, createdBy: userId });
    res.json(project);
  }
);
```

### Example 3: Admin Operation

```typescript
// Requires authentication + admin role
router.post('/scheduler/process',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const result = await triggerScheduler();
    res.json(result);
  }
);
```

### Example 4: Owner or Admin

```typescript
// User can modify their own project, or admin can modify any
router.put('/:id',
  requireAuth,
  requireOwnerOrAdmin('createdBy'),
  async (req: AuthenticatedRequest, res) => {
    const project = await updateProject(req.params.id, req.body);
    res.json(project);
  }
);
```

## Error Handling

All middleware functions return standardized error responses:

**Error Response Format:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "traceId": "trace-1234567890-abc123",
    "timestamp": "2026-02-10T12:00:00.000Z"
  }
}
```

**Common Error Codes:**

| Code | Status | Description |
|------|--------|-------------|
| AUTH_REQUIRED | 401 | Authentication required but not provided |
| TOKEN_EXPIRED | 401 | JWT token has expired |
| TOKEN_NOT_ACTIVE | 401 | Token not yet valid (nbf claim) |
| INVALID_TOKEN | 403 | Invalid JWT signature or format |
| AUTH_FAILED | 403 | Generic authentication failure |
| INSUFFICIENT_PERMISSIONS | 403 | User role not sufficient |
| PERMISSION_DENIED | 403 | User lacks required permission |
| FORBIDDEN | 403 | Access denied (owner/admin check failed) |

## Security Considerations

### ✅ Security Best Practices Implemented

1. **RS256 Asymmetric Keys**: More secure than HS256 symmetric keys
2. **No Sensitive Data Leakage**: Error messages don't expose internal details
3. **Trace IDs**: Every request gets unique ID for debugging without exposing internals
4. **Token Expiration**: Enforced by JWT verification
5. **Secure Development Mode**: Bypasses auth only in development environment
6. **Permission Wildcards**: Supports fine-grained and broad permissions
7. **Proper HTTP Status Codes**: 401 for auth, 403 for authorization

### ⚠️ Important Notes

1. **Keep Private Key Secret**: Never commit `keys/private.key` to version control
2. **Use HTTPS**: JWT tokens should only be transmitted over HTTPS in production
3. **Token Expiration**: Set reasonable expiration times (e.g., 1 hour)
4. **Refresh Tokens**: Implement refresh token mechanism for long-lived sessions
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
6. **Audit Logging**: Log all authentication and authorization failures

### 🔐 Recommended .gitignore

```
# JWT Keys (never commit!)
keys/private.key
keys/public.key

# Environment files with secrets
.env
.env.local
```

## Testing

### Run Tests

```bash
# All middleware tests
npm test -- middleware

# Specific test file
npm test -- middleware/auth.test.ts

# With coverage
npm test -- --coverage middleware
```

### Coverage Targets

| File | Target | Current |
|------|--------|---------|
| auth.ts | >90% | ✅ >90% |
| rbac.ts | >90% | ✅ >90% |

### Test Strategy

**Unit Tests:**
- ✅ Valid token authentication
- ✅ Expired token handling
- ✅ Invalid token handling
- ✅ Missing authorization header
- ✅ Malformed authorization header
- ✅ Role-based authorization
- ✅ Permission-based authorization
- ✅ Wildcard permission matching
- ✅ Admin wildcard privileges
- ✅ Owner/admin access control
- ✅ Error response formats
- ✅ Security: No data leakage

## Development Mode

When `NODE_ENV=development` and JWT keys are not found, the middleware provides a bypass:

```typescript
// Auto-generated development user
{
  sub: 'dev-user',
  email: 'dev@example.com',
  role: 'admin',
  permissions: ['*'],
  iat: <current-time>,
  exp: <current-time + 1 hour>
}
```

**⚠️ WARNING**: This bypass only works in development mode. Production must have valid keys.

## Integration with Existing Platform

This middleware is compatible with the platform's existing auth system at `/src/platform/api/middleware/auth.middleware.ts`.

**Key Differences:**
- Scheduling middleware is self-contained (no external dependencies)
- Uses same JWT format and verification strategy
- Compatible with existing token generation
- Follows same error response format

## Troubleshooting

### Problem: "JWT public key not found"

**Solution:**
```bash
npm run setup:jwt
```

Or set custom path:
```bash
export JWT_PUBLIC_KEY_PATH=/path/to/public.key
```

### Problem: "Authentication bypassed in production"

**Cause**: JWT public key not loaded and `NODE_ENV=production`

**Solution**: Ensure public key exists at `keys/public.key` or set `JWT_PUBLIC_KEY_PATH`

### Problem: "Token expired" errors immediately

**Cause**: Token expiration time is too short or server clock is incorrect

**Solution**:
1. Check token expiration claim (`exp`)
2. Verify server time is synchronized (NTP)
3. Increase token expiration time

### Problem: "Permission denied" for valid user

**Cause**: User lacks required permission

**Solution**:
1. Check user's permissions in JWT payload
2. Verify permission string matches exactly (case-sensitive)
3. Use wildcard permissions for broader access

## Future Enhancements

Potential improvements for future iterations:

- [ ] Rate limiting per user/IP
- [ ] OAuth 2.0 / OpenID Connect integration
- [ ] Multi-factor authentication (MFA)
- [ ] Token refresh mechanism
- [ ] Session management
- [ ] Audit logging service
- [ ] Permission caching
- [ ] Dynamic role/permission assignment
- [ ] IP allowlisting/denylisting
- [ ] Geographic restrictions

## References

- [JWT.io](https://jwt.io/) - JWT debugger and information
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [RFC 7519 - JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 7517 - JSON Web Key](https://datatracker.ietf.org/doc/html/rfc7517)
