# ADR-003: Use JWT RS256 for Authentication

## Status

**ACCEPTED** - 2026-01-15

## Context

We need to implement secure authentication for the Task Management API. Requirements include:
- Stateless authentication for horizontal scaling
- Secure token-based access
- Support for token refresh
- Industry-standard approach

### Options Considered

1. **JWT with RS256 (asymmetric)**
2. JWT with HS256 (symmetric)
3. Session-based authentication
4. OAuth 2.0 / OpenID Connect (external provider)
5. API Keys

## Decision

We will use **JWT with RS256 (asymmetric) signing**.

## Rationale

### Why JWT

| Factor | Assessment |
|--------|------------|
| **Stateless** | No server-side session storage required |
| **Scalable** | Works seamlessly with horizontal scaling |
| **Self-contained** | Contains user identity and claims |
| **Standard** | RFC 7519, widely supported |
| **Portable** | Can be used across services |

### Why RS256 (Asymmetric)

| Factor | HS256 (Symmetric) | RS256 (Asymmetric) |
|--------|-------------------|---------------------|
| **Key Management** | Shared secret needed | Public/private key pair |
| **Verification** | Requires secret | Public key only |
| **Security** | Secret exposure = full compromise | Private key isolated |
| **Microservices** | Secret must be shared | Public key distribution |
| **Key Rotation** | Complex | Easier with public key |

### Token Strategy

```
Access Token:
├── Algorithm: RS256
├── Expiry: 1 hour
├── Claims: sub (user ID), email, iat, exp, iss, aud
└── Usage: API authentication

Refresh Token:
├── Type: Opaque (random string)
├── Expiry: 7 days
├── Storage: Hashed in database
├── Rotation: Single-use, new token on refresh
└── Usage: Obtain new access tokens
```

## Implementation

### Token Generation

```typescript
// Generate access token
const accessToken = jwt.sign(
  {
    sub: user.id,
    email: user.email
  },
  privateKey,
  {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer: 'task-api',
    audience: 'task-api-client'
  }
);

// Generate refresh token
const refreshToken = crypto.randomBytes(64).toString('hex');
const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
// Store refreshTokenHash in database
```

### Token Verification

```typescript
// Verify access token
const payload = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'task-api',
  audience: 'task-api-client'
});
```

### Security Headers

```typescript
// Authorization header format
Authorization: Bearer <access_token>

// Response headers for security
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

## Consequences

### Positive

- **Stateless scaling** - no session store needed
- **Secure verification** - public key can be distributed
- **Key rotation** - private key can be rotated independently
- **Standard compliance** - interoperable with other services
- **Reduced attack surface** - private key isolated

### Negative

- **Key management** - RSA key pair generation and storage
- **Token size** - RS256 tokens larger than HS256
- **Revocation complexity** - no built-in revocation
- **Clock skew** - requires synchronized clocks

### Mitigation

- Store private key in secure vault (env vars, secrets manager)
- Accept larger token size (still reasonable)
- Implement token blacklist for critical revocations
- Use short expiry + refresh tokens

## Security Considerations

### Token Storage (Client)

| Storage | XSS Risk | CSRF Risk | Recommendation |
|---------|----------|-----------|----------------|
| localStorage | High | None | Not recommended |
| sessionStorage | High | None | Not recommended |
| HttpOnly Cookie | None | High | Use with CSRF protection |
| Memory | None | None | Recommended for SPAs |

### Best Practices

1. **Short expiry** - 1 hour for access tokens
2. **Secure transmission** - HTTPS only
3. **Audience validation** - verify `aud` claim
4. **Issuer validation** - verify `iss` claim
5. **Algorithm validation** - only accept RS256
6. **Key rotation** - rotate keys periodically

## Related Decisions

- ADR-001: Node.js + TypeScript
- ADR-002: PostgreSQL (refresh token storage)

## References

- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
