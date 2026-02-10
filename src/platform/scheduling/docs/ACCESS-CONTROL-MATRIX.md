# Access Control Matrix - Scheduling System

This document defines the complete access control matrix for the scheduling system's project lifecycle API.

## Overview

The scheduling system implements a hybrid access control model:
- **Role-Based Access Control (RBAC)**: Coarse-grained access based on user roles
- **Permission-Based Access Control (PBAC)**: Fine-grained access based on specific permissions

## User Roles

| Role | Description | Default Permissions |
|------|-------------|---------------------|
| `admin` | Full system access, can perform all operations | `*` (all permissions) |
| `operator` | Operations staff, can monitor and manage projects | `scheduler:view`, `projects:read`, `projects:cancel` |
| `developer` | Development team, can create and manage projects | `projects:*`, `phases:*` |
| `viewer` | Read-only access, can view projects and analytics | `projects:read`, `analytics:view` |

## Permission Structure

Permissions follow the format: `resource:action`

Example: `projects:create`, `phases:complete`, `scheduler:trigger`

### Wildcard Support

- `*` - Admin wildcard, grants ALL permissions
- `resource:*` - Resource wildcard, grants all actions on a resource (e.g., `projects:*`)

## Complete Access Control Matrix

### Project CRUD Operations

| Endpoint | Method | Required Permission | Allowed Roles | Notes |
|----------|--------|-------------------|---------------|-------|
| `/projects` | POST | `projects:create` | admin, developer | Authenticated users only |
| `/projects` | GET | `projects:list` | admin, developer, viewer | Authenticated users only |
| `/projects/:id` | GET | `projects:read` | admin, developer, viewer, operator | Authenticated users only |
| `/projects/:id` | PUT | `projects:update` | admin, developer | Not yet implemented |
| `/projects/:id` | DELETE | `projects:delete` | admin | Not yet implemented |

### Project Lifecycle Operations

| Endpoint | Method | Required Permission | Allowed Roles | Notes |
|----------|--------|-------------------|---------------|-------|
| `/projects/:id/start` | POST | `projects:update` | admin, developer | Start project execution |
| `/projects/:id/cancel` | POST | Role-based: admin OR operator | admin, operator | Critical operation |
| `/projects/:id/pause` | POST | `projects:update` | admin, operator | Not yet implemented |
| `/projects/:id/resume` | POST | `projects:update` | admin, operator | Not yet implemented |

### Phase Management Operations

| Endpoint | Method | Required Permission | Allowed Roles | Notes |
|----------|--------|-------------------|---------------|-------|
| `/projects/:id/phases` | GET | `phases:read` | admin, developer, viewer | View all phases |
| `/projects/:id/phases/:phase/complete` | POST | `phases:complete` | admin, developer | Mark phase as complete |
| `/projects/:id/phases/:phase/fail` | POST | `phases:fail` | admin, developer | Mark phase as failed |
| `/projects/:id/phases/:phase/retry` | POST | `phases:manage` | admin, operator | Not yet implemented |

### Scheduler Operations

| Endpoint | Method | Required Permission | Allowed Roles | Notes |
|----------|--------|-------------------|---------------|-------|
| `/scheduler/process` | POST | Role-based: admin only | admin | **ADMIN ONLY** - Manual scheduler trigger |
| `/agents/pool` | GET | `scheduler:view` | admin, operator | View agent pool status |

### Analytics & Reporting

| Endpoint | Method | Required Permission | Allowed Roles | Notes |
|----------|--------|-------------------|---------------|-------|
| `/dashboard` | GET | Public (no auth) | all | Public dashboard |
| `/analytics/throughput` | GET | `analytics:view` | admin, developer, viewer | Weekly throughput metrics |
| `/analytics/phase-durations` | GET | `analytics:view` | admin, developer, viewer | Average phase durations |
| `/analytics/agent-utilization` | GET | `analytics:view` | admin, operator | Agent utilization metrics |

## Security Principles

### 1. Defense in Depth

Multiple layers of security:
1. **Authentication**: JWT token validation (RS256)
2. **Authorization**: Role and permission checks
3. **Input Validation**: Schema validation (Zod)
4. **Error Handling**: Secure error messages (no sensitive data leakage)

### 2. Principle of Least Privilege

Users are granted the minimum permissions necessary:
- Viewers can only read data
- Developers can create and manage projects
- Operators can monitor and intervene in operations
- Admins have full control

### 3. Fail-Safe Defaults

- All endpoints require authentication by default (except explicitly public ones)
- Deny access if authentication or authorization fails
- No silent failures

### 4. Separation of Duties

Critical operations require elevated privileges:
- Manual scheduler triggers: Admin only
- Project cancellation: Admin or Operator only
- System configuration: Admin only

## Implementation Details

### Middleware Stack

Routes use a middleware chain for security:

```typescript
router.post(
  '/scheduler/process',
  requireAuth,      // Step 1: Validate JWT token
  requireAdmin,     // Step 2: Check admin role
  handler           // Step 3: Execute business logic
);
```

### Permission Checking Flow

1. **Extract JWT** from `Authorization: Bearer <token>` header
2. **Verify Signature** using RS256 public key
3. **Validate Expiration** and required fields
4. **Check Role** (if role-based middleware applied)
5. **Check Permissions** (if permission-based middleware applied)
6. **Allow or Deny** access based on results

### Error Responses

All authorization failures return standardized error responses:

```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Required role: admin",
    "traceId": "trace-1234567890-abcdef",
    "timestamp": "2024-01-20T10:30:00.000Z"
  }
}
```

Error codes:
- `AUTH_REQUIRED` (401): No authentication provided
- `TOKEN_EXPIRED` (401): JWT token expired
- `INVALID_TOKEN` (403): Invalid JWT signature
- `INSUFFICIENT_PERMISSIONS` (403): Role check failed
- `PERMISSION_DENIED` (403): Permission check failed
- `FORBIDDEN` (403): Resource ownership check failed

## Testing

Comprehensive test coverage ensures access control works correctly:

### Test Categories

1. **Positive Tests**: Verify authorized access succeeds
2. **Negative Tests**: Verify unauthorized access fails
3. **Edge Cases**: Test expired tokens, malformed headers, etc.
4. **Wildcard Tests**: Verify wildcard permissions work correctly

### Test File

See: `src/platform/scheduling/presentation/routes/__tests__/project-routes-access-control.test.ts`

### Running Tests

```bash
# Run all RBAC tests
npm test -- rbac

# Run access control integration tests
npm test -- project-routes-access-control

# Run with coverage
npm run test:coverage
```

## Role Permission Mappings

### Admin Role (`admin`)

```json
{
  "role": "admin",
  "permissions": ["*"]
}
```

Can access: **All endpoints**

### Operator Role (`operator`)

```json
{
  "role": "operator",
  "permissions": [
    "projects:read",
    "projects:list",
    "projects:cancel",
    "scheduler:view",
    "analytics:view"
  ]
}
```

Can access:
- View all projects
- Cancel projects
- View agent pool
- View analytics
- View dashboard

Cannot access:
- Create/update projects
- Complete/fail phases
- Trigger scheduler manually

### Developer Role (`developer`)

```json
{
  "role": "developer",
  "permissions": [
    "projects:*",
    "phases:*",
    "analytics:view"
  ]
}
```

Can access:
- Create, read, update projects
- Complete/fail phases
- View analytics
- View dashboard

Cannot access:
- Cancel projects (operator/admin only)
- Trigger scheduler (admin only)
- View agent pool details

### Viewer Role (`viewer`)

```json
{
  "role": "viewer",
  "permissions": [
    "projects:read",
    "projects:list",
    "analytics:view"
  ]
}
```

Can access:
- Read projects
- List projects
- View analytics
- View dashboard

Cannot access:
- Create/update projects
- Manage phases
- Cancel projects
- Trigger scheduler

## Security Best Practices

### For API Consumers

1. **Store JWT Securely**: Use secure storage (not localStorage)
2. **Token Refresh**: Implement token refresh before expiration
3. **HTTPS Only**: Always use HTTPS in production
4. **Handle Errors**: Check for 401/403 and redirect to login
5. **Minimal Permissions**: Request only necessary permissions

### For Administrators

1. **Regular Key Rotation**: Rotate JWT signing keys periodically
2. **Audit Logs**: Monitor access to sensitive endpoints
3. **Principle of Least Privilege**: Grant minimal necessary permissions
4. **Review Permissions**: Regularly audit user roles and permissions
5. **Revoke Access**: Implement token revocation for compromised accounts

## Future Enhancements

### Planned Features

1. **Resource-Level Permissions**: Owner-based access control
   - Project owners can always access their own projects
   - Implement `requireOwnerOrAdmin` middleware

2. **Dynamic Permissions**: Load permissions from database
   - Currently permissions are static in JWT
   - Plan to support dynamic permission updates

3. **Audit Logging**: Comprehensive audit trail
   - Log all access attempts (success and failure)
   - Include user, timestamp, IP, action

4. **Rate Limiting**: Prevent abuse
   - Per-user rate limits on sensitive endpoints
   - Implement exponential backoff for failed attempts

5. **API Keys**: Service-to-service authentication
   - Support API key authentication for integrations
   - Separate permissions for service accounts

## References

- JWT Authentication: `src/platform/scheduling/presentation/middleware/auth.ts`
- RBAC Middleware: `src/platform/scheduling/presentation/middleware/rbac.ts`
- Route Definitions: `src/platform/scheduling/presentation/routes/project-routes.ts`
- Test Suite: `src/platform/scheduling/presentation/routes/__tests__/`

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-01-20 | 1.0.0 | Initial access control matrix | Software Engineer Agent |

## Questions?

For questions or clarification on access control policies, contact the security team or refer to:
- Security documentation: `docs/security/`
- RBAC implementation: `src/platform/scheduling/presentation/middleware/rbac.ts`
