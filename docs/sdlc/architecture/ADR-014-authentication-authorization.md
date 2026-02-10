# ADR-014: Authentication and Authorization

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Security

---

## Context

The Deltek Catalyst platform requires enterprise-grade authentication and authorization supporting:

- Single Sign-On (SSO) with corporate identity providers
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Attribute-based access control (ABAC) for complex policies
- Session management across multiple devices
- API authentication for CI/CD integration
- Audit logging of all authentication events

The current implementation uses JWT RS256 tokens with basic role checking.

## Decision

**We will implement OAuth 2.0 + OpenID Connect** with the following architecture:

### 1. Authentication Protocol: OAuth 2.0 + OIDC

**Chosen**: OAuth 2.0 Authorization Code Flow with PKCE

```
+--------+                               +---------------+
|        |---(1) Authorization Request->|   Identity    |
|        |                               |   Provider    |
|        |<--(2) Authorization Code-----|   (IdP)       |
|        |                               +---------------+
| Client |
|        |---(3) Token Request--------->+---------------+
|        |       (code + PKCE verifier) |   Catalyst     |
|        |<--(4) Access + ID + Refresh--|   Backend     |
|        |                               +---------------+
+--------+
```

**Supported Identity Providers**:
- Okta
- Azure Active Directory
- Auth0
- PingFederate
- OneLogin
- Custom OIDC providers

### 2. Token Strategy: Short-lived Access + Refresh Tokens

**Chosen**:
- Access Token: 15 minutes (JWT)
- Refresh Token: 7 days (opaque, stored in DB)
- ID Token: For user info only

```typescript
interface AccessToken {
  sub: string;           // User ID
  tenant_id: string;     // Tenant identifier
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;           // 15 minutes
  iss: string;           // Catalyst issuer
  aud: string;           // API audience
}
```

### 3. Session Management: Secure Cookie + Token Binding

**Chosen**: HttpOnly cookie for web, Bearer token for API

**Web Application**:
```http
Set-Cookie: catalyst_session=<encrypted_token>;
  HttpOnly;
  Secure;
  SameSite=Strict;
  Path=/;
  Max-Age=900
```

**API Clients**:
```http
Authorization: Bearer <access_token>
```

### 4. Authorization Model: RBAC + ABAC Hybrid

**Chosen**: Role-based with attribute-based policy extensions

```yaml
# Roles define base permissions
roles:
  admin:
    permissions: ["*"]

  operator:
    permissions:
      - "deployments:*"
      - "infrastructure:*"
      - "agents:execute"

# Policies add contextual restrictions
policies:
  production_deployment:
    description: "Restrict production deployments"
    condition:
      resource.environment: "production"
      action: "deployments:create"
    effect: "deny"
    unless:
      - user.role IN ["admin", "operator"]
      - time.is_business_hours()
      - user.has_approval("production_deployment")
```

### 5. MFA: Adaptive Multi-Factor

**Chosen**: Risk-based MFA with multiple methods

| Risk Level | Trigger | Required MFA |
|------------|---------|--------------|
| Low | Normal login | Optional |
| Medium | New device | Required |
| High | Sensitive action | Step-up required |
| Critical | Admin action | Hardware key |

**Supported MFA Methods**:
- TOTP (Authenticator apps)
- SMS (fallback only)
- Push notifications
- Hardware keys (FIDO2/WebAuthn)

## Alternatives Considered

### Authentication Protocol

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **OAuth 2.0 + OIDC** | Standard, SSO support | Complex | **Selected** |
| SAML 2.0 | Enterprise standard | XML complexity | Supported as IdP |
| JWT only | Simple | No SSO, no refresh | Current - upgrade needed |
| Session-based | Simple | Scaling issues | Rejected |

### Token Storage

| Option | Security | UX | Decision |
|--------|----------|----|----|
| **HttpOnly Cookie** | High | Seamless | **Selected for Web** |
| localStorage | Low (XSS risk) | Easy | Rejected |
| sessionStorage | Medium | Tab-limited | Rejected |
| Memory only | High | Lost on refresh | Used for sensitive ops |

### Authorization Model

| Option | Flexibility | Complexity | Decision |
|--------|-------------|------------|----------|
| RBAC only | Low | Low | Insufficient |
| ABAC only | High | High | Too complex |
| **RBAC + ABAC** | High | Medium | **Selected** |
| ACL | Medium | Medium | Rejected |

## Consequences

### Positive

1. **Enterprise SSO**: Seamless integration with corporate identity
2. **Security**: Short-lived tokens limit breach impact
3. **Flexibility**: ABAC policies handle complex scenarios
4. **Compliance**: Audit trail for all auth events
5. **MFA**: Adaptive protection without friction

### Negative

1. **Complexity**: OAuth flows require careful implementation
2. **Dependencies**: Requires IdP integration per customer
3. **Session Sync**: Must handle token refresh across tabs

### Mitigations

1. **Use Proven Libraries**: passport.js, oidc-client
2. **IdP Abstraction**: Support multiple IdPs via common interface
3. **Token Refresh Worker**: Background refresh before expiry

## Implementation Details

### Authentication Middleware

```typescript
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from cookie or header
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        type: 'https://api.catalyst.deltek.com/errors/auth/missing-token',
        title: 'Authentication Required',
        status: 401,
        detail: 'No authentication token provided'
      });
    }

    // Verify token
    const payload = await verifyAccessToken(token);

    // Check token revocation
    if (await isTokenRevoked(payload.jti)) {
      return res.status(401).json({
        type: 'https://api.catalyst.deltek.com/errors/auth/revoked-token',
        title: 'Token Revoked',
        status: 401
      });
    }

    // Set tenant context
    await setTenantContext(req.db, payload.tenant_id);

    // Attach user to request
    req.user = payload;
    req.tenant = await getTenant(payload.tenant_id);

    // Log authentication event
    await logAuthEvent({
      type: 'token_validated',
      userId: payload.sub,
      tenantId: payload.tenant_id,
      ip: req.ip
    });

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        type: 'https://api.catalyst.deltek.com/errors/auth/expired-token',
        title: 'Token Expired',
        status: 401,
        detail: 'Access token has expired. Please refresh.'
      });
    }

    return res.status(403).json({
      type: 'https://api.catalyst.deltek.com/errors/auth/invalid-token',
      title: 'Invalid Token',
      status: 403
    });
  }
};
```

### Permission Checking

```typescript
export const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { user, tenant } = req;

    // Check RBAC permissions
    const hasRolePermission = requiredPermissions.some(perm =>
      checkPermission(user.permissions, perm)
    );

    if (!hasRolePermission) {
      await logAuthEvent({
        type: 'permission_denied',
        userId: user.sub,
        tenantId: tenant.id,
        requiredPermissions,
        userPermissions: user.permissions
      });

      return res.status(403).json({
        type: 'https://api.catalyst.deltek.com/errors/auth/forbidden',
        title: 'Insufficient Permissions',
        status: 403,
        detail: `Required: ${requiredPermissions.join(' or ')}`
      });
    }

    // Check ABAC policies
    const resource = extractResource(req);
    const policyResult = await evaluatePolicies(user, resource, req.method);

    if (!policyResult.allowed) {
      return res.status(403).json({
        type: 'https://api.catalyst.deltek.com/errors/auth/policy-denied',
        title: 'Policy Denied',
        status: 403,
        detail: policyResult.reason
      });
    }

    next();
  };
};
```

### SSO Configuration

```typescript
interface SSOConfig {
  provider: 'okta' | 'azure_ad' | 'auth0' | 'custom_oidc';
  clientId: string;
  clientSecret: string;  // Encrypted in database
  issuer: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  jwksUri: string;
  scopes: string[];
  attributeMapping: {
    email: string;
    name: string;
    groups?: string;
  };
}

// Per-tenant SSO configuration
const tenantSSO = await db.query(`
  SELECT * FROM tenant_sso_configs
  WHERE tenant_id = $1 AND enabled = true
`, [tenantId]);
```

## Audit Events

All authentication events are logged:

| Event | Data Captured |
|-------|--------------|
| `login_attempt` | user, ip, device, success, failure_reason |
| `login_success` | user, ip, device, mfa_method |
| `login_failure` | user, ip, device, failure_reason |
| `logout` | user, session_id |
| `token_refresh` | user, old_token_jti, new_token_jti |
| `token_revoked` | user, token_jti, reason |
| `permission_denied` | user, resource, required_permission |
| `mfa_challenge` | user, method, success |
| `password_change` | user, ip |
| `session_terminated` | user, session_id, reason |

## References

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
