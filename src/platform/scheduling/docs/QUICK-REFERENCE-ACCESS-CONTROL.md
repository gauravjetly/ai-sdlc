# Quick Reference - Access Control

## For Developers: How to Secure New Endpoints

### Step 1: Choose Authorization Strategy

| Strategy | When to Use | Example |
|----------|-------------|---------|
| **No Auth** | Public data only | Dashboard, health check |
| **Permission-Based** | Standard CRUD operations | Create project, update phase |
| **Role-Based** | Critical operations | Cancel project, trigger scheduler |

### Step 2: Apply Middleware

#### Public Endpoint (No Auth)
```typescript
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Public access
}));
```

#### Permission-Based Endpoint
```typescript
router.post(
  '/projects',
  requireAuth,                      // JWT authentication
  requirePermission('projects:create'), // Permission check
  asyncHandler(async (req, res) => {
    // Business logic
  })
);
```

#### Role-Based Endpoint
```typescript
router.post(
  '/scheduler/process',
  requireAuth,          // JWT authentication
  requireAdmin,         // Admin-only
  asyncHandler(async (req, res) => {
    // Business logic
  })
);
```

#### Multiple Roles Allowed
```typescript
router.post(
  '/projects/:id/cancel',
  requireAuth,                      // JWT authentication
  requireRole('admin', 'operator'), // Admin OR Operator
  asyncHandler(async (req, res) => {
    // Business logic
  })
);
```

### Step 3: Add Tests

```typescript
describe('New Endpoint', () => {
  it('should allow access for admin', async () => {
    const token = generateToken({ role: 'admin', permissions: ['*'] });
    await request(app)
      .post('/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should deny access for non-admin', async () => {
    const token = generateToken({ role: 'developer', permissions: [] });
    await request(app)
      .post('/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
```

---

## Permission Constants

Use these constants from `PERMISSIONS` object:

```typescript
import { PERMISSIONS } from '../middleware/rbac';

// Project permissions
PERMISSIONS.PROJECTS_CREATE   // 'projects:create'
PERMISSIONS.PROJECTS_READ     // 'projects:read'
PERMISSIONS.PROJECTS_UPDATE   // 'projects:update'
PERMISSIONS.PROJECTS_DELETE   // 'projects:delete'
PERMISSIONS.PROJECTS_LIST     // 'projects:list'
PERMISSIONS.PROJECTS_ADMIN    // 'projects:*'

// Phase permissions
PERMISSIONS.PHASES_READ       // 'phases:read'
PERMISSIONS.PHASES_COMPLETE   // 'phases:complete'
PERMISSIONS.PHASES_FAIL       // 'phases:fail'
PERMISSIONS.PHASES_MANAGE     // 'phases:*'

// Scheduler permissions
PERMISSIONS.SCHEDULER_TRIGGER // 'scheduler:trigger'
PERMISSIONS.SCHEDULER_VIEW    // 'scheduler:view'
PERMISSIONS.SCHEDULER_ADMIN   // 'scheduler:*'

// Analytics permissions
PERMISSIONS.ANALYTICS_VIEW    // 'analytics:view'
PERMISSIONS.ANALYTICS_ADMIN   // 'analytics:*'

// Admin wildcard
PERMISSIONS.ALL               // '*'
```

---

## Role Definitions

| Role | Default Permissions | Typical Use |
|------|-------------------|-------------|
| `admin` | `*` (all) | System administrators |
| `operator` | `projects:read`, `projects:cancel`, `scheduler:view` | Operations team |
| `developer` | `projects:*`, `phases:*`, `analytics:view` | Development team |
| `viewer` | `projects:read`, `analytics:view` | Read-only users |

---

## Error Codes

When access is denied, these error codes are returned:

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `AUTH_REQUIRED` | 401 | No JWT token provided |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `INVALID_TOKEN` | 403 | Invalid JWT signature |
| `INSUFFICIENT_PERMISSIONS` | 403 | Role check failed |
| `PERMISSION_DENIED` | 403 | Permission check failed |
| `FORBIDDEN` | 403 | Resource ownership check failed |

---

## Testing Utilities

### Generate Test Token

```typescript
import * as jwt from 'jsonwebtoken';

function generateToken(payload: {
  sub?: string;
  email?: string;
  role: 'admin' | 'developer' | 'viewer' | 'operator';
  permissions: string[];
}): string {
  return jwt.sign(
    {
      sub: payload.sub || 'test-user',
      email: payload.email || 'test@example.com',
      role: payload.role,
      permissions: payload.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    privateKey,
    { algorithm: 'RS256' }
  );
}
```

### Make Authenticated Request

```typescript
const token = generateToken({
  role: 'admin',
  permissions: ['*']
});

await request(app)
  .post('/endpoint')
  .set('Authorization', `Bearer ${token}`)
  .send({ data: 'value' })
  .expect(200);
```

---

## Common Patterns

### Pattern 1: CRUD Endpoints

```typescript
// Create - Requires create permission
router.post('/', requireAuth, requirePermission('resource:create'), handler);

// Read (list) - Requires read permission
router.get('/', requireAuth, requirePermission('resource:list'), handler);

// Read (single) - Requires read permission
router.get('/:id', requireAuth, requirePermission('resource:read'), handler);

// Update - Requires update permission
router.put('/:id', requireAuth, requirePermission('resource:update'), handler);

// Delete - Often admin-only
router.delete('/:id', requireAuth, requireAdmin, handler);
```

### Pattern 2: Admin Operations

```typescript
// System-wide operations - Admin only
router.post('/system/restart', requireAuth, requireAdmin, handler);
router.post('/system/config', requireAuth, requireAdmin, handler);
router.delete('/system/cache', requireAuth, requireAdmin, handler);
```

### Pattern 3: Elevated Operations

```typescript
// Operations requiring operational authority - Admin or Operator
router.post('/projects/:id/cancel',
  requireAuth,
  requireRole('admin', 'operator'),
  handler
);

router.post('/projects/:id/priority',
  requireAuth,
  requireRole('admin', 'operator'),
  handler
);
```

### Pattern 4: Read-Only Operations

```typescript
// Public data - No auth
router.get('/dashboard', handler);
router.get('/health', handler);

// Analytics - Read permission
router.get('/analytics/reports',
  requireAuth,
  requirePermission('analytics:view'),
  handler
);
```

---

## Checklist for New Endpoints

Before merging code with new endpoints:

- [ ] Authentication middleware applied (`requireAuth`)
- [ ] Authorization middleware applied (`requireRole` or `requirePermission`)
- [ ] Permission constant used (not hardcoded string)
- [ ] Tests written for authorized access
- [ ] Tests written for unauthorized access
- [ ] Access control matrix documentation updated
- [ ] Error handling includes trace ID
- [ ] Endpoint added to this quick reference (if pattern is new)

---

## Troubleshooting

### "Authentication required" error

**Cause**: No `Authorization` header or invalid format

**Fix**: Add header: `Authorization: Bearer <your-jwt-token>`

### "Insufficient permissions" error

**Cause**: User's role doesn't match required roles

**Fix**: Check user's role in JWT payload matches endpoint requirements

### "Permission denied" error

**Cause**: User doesn't have required permission

**Fix**: Check user's permissions array includes required permission

### Tests failing with "JWT public key not found"

**Cause**: Test keys not generated

**Fix**: Run `npm run setup:jwt` or generate keys in test setup

---

## Resources

- Full Documentation: `src/platform/scheduling/docs/ACCESS-CONTROL-MATRIX.md`
- Implementation Details: `src/platform/scheduling/docs/ADMIN-ACCESS-CONTROL-IMPLEMENTATION.md`
- RBAC Middleware: `src/platform/scheduling/presentation/middleware/rbac.ts`
- Auth Middleware: `src/platform/scheduling/presentation/middleware/auth.ts`
- Test Examples: `src/platform/scheduling/presentation/routes/__tests__/project-routes-access-control.test.ts`

---

**Last Updated**: 2024-01-20
**Version**: 1.0.0
