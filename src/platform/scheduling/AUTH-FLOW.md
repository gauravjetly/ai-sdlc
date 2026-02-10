# Authentication & Authorization Flow

## Overview

This document describes the complete authentication and authorization flow for the scheduling system API.

## Authentication Flow

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       │ 1. HTTP Request
       │    Authorization: Bearer <jwt-token>
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  Express Server                                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  authenticateJWT Middleware                        │ │
│  │                                                    │ │
│  │  1. Extract token from Authorization header       │ │
│  │  2. Verify JWT signature using RS256 public key   │ │
│  │  3. Check token expiration                        │ │
│  │  4. Validate required fields (sub, email, role)   │ │
│  │  5. Attach user to req.user                       │ │
│  │  6. Generate and attach trace ID                  │ │
│  │                                                    │ │
│  │  Success: next() -> Continue to authorization     │ │
│  │  Failure: 401/403 error response                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────┬───────────────────────────────────────────┘
               │
               │ 2. Authenticated Request
               │    req.user = { sub, email, role, permissions }
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  Authorization Middleware (if present)                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  requireRole / requirePermission / requireAdmin    │ │
│  │                                                    │ │
│  │  1. Check if req.user exists                      │ │
│  │  2. Validate role OR permission                   │ │
│  │  3. Apply wildcard matching if applicable         │ │
│  │                                                    │ │
│  │  Success: next() -> Continue to route handler     │ │
│  │  Failure: 403 error response                      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────┬───────────────────────────────────────────┘
               │
               │ 3. Authorized Request
               │    req.user validated for this endpoint
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  Route Handler                                           │
│                                                          │
│  async (req: AuthenticatedRequest, res) => {             │
│    const userId = req.user.sub;                          │
│    // ... business logic                                 │
│    res.json(result);                                     │
│  }                                                       │
│                                                          │
└──────────────┬───────────────────────────────────────────┘
               │
               │ 4. Response
               │
               ▼
┌──────────────┐
│   Client     │
└──────────────┘
```

## Authorization Models

### 1. Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────┐
│  User Roles (Hierarchical)                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐                                   │
│  │  admin  │  ← Full system access              │
│  └────┬────┘                                    │
│       │                                         │
│  ┌────▼────────┐                                │
│  │  operator   │  ← Operations & lifecycle      │
│  └────┬────────┘                                │
│       │                                         │
│  ┌────▼──────────┐                              │
│  │  developer    │  ← Create & manage projects  │
│  └────┬──────────┘                              │
│       │                                         │
│  ┌────▼────┐                                    │
│  │  viewer │  ← Read-only access                │
│  └─────────┘                                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2. Permission-Based Authorization

```
┌─────────────────────────────────────────────────┐
│  Permission Model                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Format: <resource>:<action>                    │
│                                                 │
│  Examples:                                      │
│  • projects:create                              │
│  • projects:read                                │
│  • projects:update                              │
│  • projects:delete                              │
│  • projects:* (wildcard)                        │
│                                                 │
│  Special:                                       │
│  • * (admin wildcard - all permissions)         │
│                                                 │
└─────────────────────────────────────────────────┘

Permission Matching Logic:
┌─────────────────────────────────────────────────┐
│                                                 │
│  1. Exact Match                                 │
│     "projects:create" matches "projects:create" │
│                                                 │
│  2. Wildcard Match                              │
│     "projects:*" matches "projects:create"      │
│     "projects:*" matches "projects:read"        │
│     "projects:*" matches "projects:delete"      │
│                                                 │
│  3. Admin Wildcard                              │
│     "*" matches EVERYTHING                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Endpoint Security Matrix

```
┌────────────────────────────────────────────────────────────────┐
│  Endpoint Security Requirements                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Public Endpoints (No Auth)                                    │
│  ├─ GET  /dashboard                                            │
│                                                                │
│  Authenticated + Permission-Based                              │
│  ├─ POST /projects              → projects:create             │
│  ├─ GET  /projects              → projects:list               │
│  ├─ GET  /projects/:id          → projects:read               │
│  ├─ POST /projects/:id/start    → projects:update             │
│  ├─ GET  /projects/:id/phases   → phases:read                 │
│  ├─ POST /:id/phases/:p/complete → phases:complete            │
│  ├─ POST /:id/phases/:p/fail     → phases:fail                │
│  ├─ GET  /agents/pool           → scheduler:view              │
│  ├─ GET  /analytics/throughput  → analytics:view              │
│  └─ GET  /analytics/phase-dur... → analytics:view             │
│                                                                │
│  Authenticated + Role-Based                                    │
│  ├─ POST /projects/:id/cancel   → admin OR operator           │
│  └─ POST /scheduler/process     → admin ONLY                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Error Flow

```
┌──────────────────────────────────────────────────┐
│  Error Scenarios                                 │
├──────────────────────────────────────────────────┤
│                                                  │
│  1. No Authorization Header                      │
│     ↓                                            │
│     401 AUTH_REQUIRED                            │
│     "No authorization header provided"           │
│                                                  │
│  2. Malformed Header                             │
│     ↓                                            │
│     401 AUTH_REQUIRED                            │
│     "Authorization header must be: Bearer <token>"│
│                                                  │
│  3. Token Expired                                │
│     ↓                                            │
│     401 TOKEN_EXPIRED                            │
│     "JWT token has expired"                      │
│                                                  │
│  4. Invalid Signature                            │
│     ↓                                            │
│     403 INVALID_TOKEN                            │
│     "Invalid JWT token"                          │
│                                                  │
│  5. Insufficient Role                            │
│     ↓                                            │
│     403 INSUFFICIENT_PERMISSIONS                 │
│     "Required role: admin"                       │
│                                                  │
│  6. Missing Permission                           │
│     ↓                                            │
│     403 PERMISSION_DENIED                        │
│     "Required permission: projects:delete"       │
│                                                  │
└──────────────────────────────────────────────────┘

Error Response Format:
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "traceId": "trace-1234567890-abc123",
    "timestamp": "2026-02-10T12:00:00.000Z"
  }
}
```

## JWT Token Structure

```
┌─────────────────────────────────────────────────┐
│  JWT Token Components                           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Header (Algorithm)                             │
│  {                                              │
│    "alg": "RS256",                              │
│    "typ": "JWT"                                 │
│  }                                              │
│                                                 │
│  Payload (Claims)                               │
│  {                                              │
│    "sub": "user-123",        // User ID         │
│    "email": "user@example.com",                 │
│    "role": "developer",                         │
│    "permissions": [                             │
│      "projects:create",                         │
│      "projects:read",                           │
│      "phases:complete"                          │
│    ],                                           │
│    "iat": 1234567890,        // Issued at       │
│    "exp": 1234571490         // Expiration      │
│  }                                              │
│                                                 │
│  Signature (RS256)                              │
│  RSASHA256(                                     │
│    base64UrlEncode(header) + "." +              │
│    base64UrlEncode(payload),                    │
│    privateKey                                   │
│  )                                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Development Mode

```
┌─────────────────────────────────────────────────┐
│  Development Mode Bypass                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  Conditions:                                    │
│  • NODE_ENV === 'development'                   │
│  • JWT public key not found                     │
│                                                 │
│  Behavior:                                      │
│  • Auto-generate development user               │
│  • Grant admin role with all permissions        │
│  • Log warning to console                       │
│                                                 │
│  Development User:                              │
│  {                                              │
│    sub: 'dev-user',                             │
│    email: 'dev@example.com',                    │
│    role: 'admin',                               │
│    permissions: ['*']                           │
│  }                                              │
│                                                 │
│  ⚠️  NEVER use in production!                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Security Considerations

```
┌─────────────────────────────────────────────────┐
│  Security Best Practices Implemented            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ✅ RS256 Asymmetric Keys                       │
│     More secure than HS256 symmetric            │
│                                                 │
│  ✅ No Sensitive Data Leakage                   │
│     Error messages don't expose internals       │
│                                                 │
│  ✅ Trace IDs                                   │
│     Debug without exposing sensitive data       │
│                                                 │
│  ✅ Token Expiration                            │
│     Enforced by JWT verification                │
│                                                 │
│  ✅ Secure Development Mode                     │
│     Only bypasses in development environment    │
│                                                 │
│  ✅ Wildcard Permissions                        │
│     Flexible yet secure authorization           │
│                                                 │
│  ✅ Proper HTTP Status Codes                    │
│     401 for auth, 403 for authorization         │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Important Security Notes                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚠️  Private Key Security                       │
│     Never commit keys/private.key               │
│                                                 │
│  ⚠️  HTTPS Required                             │
│     JWT tokens must use HTTPS in production     │
│                                                 │
│  ⚠️  Token Expiration                           │
│     Set reasonable times (e.g., 1 hour)         │
│                                                 │
│  ⚠️  Refresh Tokens                             │
│     Implement for long-lived sessions           │
│                                                 │
│  ⚠️  Rate Limiting                              │
│     Add to prevent brute force attacks          │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Request Lifecycle Example

### Scenario: Developer Creates a New Project

```
1. Client Request
   ─────────────
   POST /projects
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
   Body: { name: "My Project", priority: "high" }

2. Authentication (authenticateJWT)
   ────────────────────────────────
   ✓ Extract token from header
   ✓ Verify signature with RS256 public key
   ✓ Check expiration: exp=1234571490, now=1234567890 ✓
   ✓ Validate fields: sub, email, role ✓
   ✓ Attach user to request:
     req.user = {
       sub: 'user-123',
       email: 'dev@example.com',
       role: 'developer',
       permissions: ['projects:create', 'projects:read']
     }
   ✓ Generate trace ID: trace-1234567890-abc123

3. Authorization (requirePermission('projects:create'))
   ─────────────────────────────────────────────────────
   ✓ Check if user exists ✓
   ✓ Check permissions:
     User has: ['projects:create', 'projects:read']
     Requires: 'projects:create'
     Match: ✓ EXACT MATCH

4. Route Handler
   ─────────────
   ✓ Extract user ID: userId = 'user-123'
   ✓ Create project with createdBy = 'user-123'
   ✓ Return 201 with project data

5. Response
   ────────
   201 Created
   {
     "id": "proj-456",
     "name": "My Project",
     "priority": "high",
     "status": "pending",
     "createdBy": "user-123",
     "createdAt": "2026-02-10T12:00:00.000Z"
   }
```

### Scenario: Viewer Tries to Delete Project (Unauthorized)

```
1. Client Request
   ─────────────
   DELETE /projects/proj-456
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

2. Authentication (authenticateJWT)
   ────────────────────────────────
   ✓ Token valid
   ✓ Attach user to request:
     req.user = {
       sub: 'user-789',
       email: 'viewer@example.com',
       role: 'viewer',
       permissions: ['projects:read']
     }

3. Authorization (requirePermission('projects:delete'))
   ─────────────────────────────────────────────────────
   ✓ Check if user exists ✓
   ✗ Check permissions:
     User has: ['projects:read']
     Requires: 'projects:delete'
     Match: ✗ NO MATCH

4. Error Response
   ──────────────
   403 Forbidden
   {
     "error": {
       "code": "PERMISSION_DENIED",
       "message": "Required permission: projects:delete",
       "traceId": "trace-1234567891-xyz789",
       "timestamp": "2026-02-10T12:01:00.000Z"
     }
   }
```

## Testing the Flow

### Using curl

```bash
# 1. Obtain JWT token (from your auth service)
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Make authenticated request
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","priority":"high"}'

# 3. Expected: 201 Created with project data
# If 401: Token invalid/expired
# If 403: Insufficient permissions
```

### Development Mode (No Token Required)

```bash
# Set development mode
export NODE_ENV=development

# Start server without JWT keys
npm run api:dev

# Make request without token
curl -X GET http://localhost:3000/api/projects

# Auto-uses development admin user
```

---

**For complete API reference and usage examples, see README.md**
