# Authentication System Template

## Overview
Complete authentication and authorization system with modern security practices.

## Quick Start
```bash
/sdlc-start Build authentication system using this template: templates/auth-system
```

## Features Included

### Core Authentication
- User registration with email verification
- Login with email/password
- Password reset flow
- Session management with JWT
- Refresh token rotation

### Security Features
- Password hashing (bcrypt/argon2)
- Rate limiting on auth endpoints
- Account lockout after failed attempts
- MFA support (TOTP)
- Secure cookie handling

### Authorization
- Role-based access control (RBAC)
- Permission-based authorization
- API key authentication for services

### OAuth 2.0 Integration
- Google OAuth
- Microsoft OAuth
- GitHub OAuth
- Generic OIDC provider support

---

## Pre-defined Requirements

### Functional Requirements

```markdown
## FR-AUTH-001: User Registration
The system shall allow users to register with email and password.

**Acceptance Criteria:**
- Given a new user with valid email and password
- When they submit the registration form
- Then an account is created and verification email sent

## FR-AUTH-002: Email Verification
The system shall verify user email addresses before account activation.

**Acceptance Criteria:**
- Given a user who registered
- When they click the verification link within 24 hours
- Then their account is activated

## FR-AUTH-003: User Login
The system shall authenticate users with valid credentials.

**Acceptance Criteria:**
- Given a verified user with correct credentials
- When they submit login form
- Then they receive access and refresh tokens

## FR-AUTH-004: Password Reset
The system shall allow users to reset forgotten passwords.

**Acceptance Criteria:**
- Given a registered user who forgot password
- When they request reset with valid email
- Then a reset link valid for 1 hour is sent

## FR-AUTH-005: Session Management
The system shall manage user sessions securely.

**Acceptance Criteria:**
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens are invalidated on logout
- Only one active refresh token per device

## FR-AUTH-006: Multi-Factor Authentication
The system shall support TOTP-based MFA.

**Acceptance Criteria:**
- Users can enable/disable MFA
- Login requires TOTP code when enabled
- Recovery codes provided for backup

## FR-AUTH-007: Role-Based Access
The system shall enforce role-based access control.

**Acceptance Criteria:**
- Users assigned one or more roles
- Roles have defined permissions
- API endpoints check permissions
```

### Non-Functional Requirements

```markdown
## NFR-AUTH-001: Security
- Passwords hashed with bcrypt (cost 12) or argon2id
- All traffic over TLS 1.3
- Rate limiting: 5 failed logins per 15 minutes
- Account lockout after 10 failed attempts

## NFR-AUTH-002: Performance
- Login response < 500ms
- Token validation < 50ms
- Support 1000 concurrent sessions

## NFR-AUTH-003: Compliance
- OWASP Authentication guidelines
- GDPR: Right to deletion supported
- Audit logging of all auth events
```

---

## Suggested Architecture

### Components
```
src/
├── auth/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── oauth.controller.ts
│   │   └── mfa.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── token.service.ts
│   │   ├── password.service.ts
│   │   └── mfa.service.ts
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   ├── roles.guard.ts
│   │   └── mfa.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── google.strategy.ts
│   │   └── local.strategy.ts
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       └── reset-password.dto.ts
└── users/
    ├── entities/
    │   ├── user.entity.ts
    │   └── role.entity.ts
    └── repositories/
        └── user.repository.ts
```

### API Endpoints
```
POST   /auth/register        - Register new user
POST   /auth/verify-email    - Verify email with token
POST   /auth/login           - Login with credentials
POST   /auth/logout          - Logout (invalidate tokens)
POST   /auth/refresh         - Refresh access token
POST   /auth/forgot-password - Request password reset
POST   /auth/reset-password  - Reset password with token
POST   /auth/mfa/setup       - Setup MFA
POST   /auth/mfa/verify      - Verify MFA code
DELETE /auth/mfa/disable     - Disable MFA
GET    /auth/oauth/google    - Google OAuth redirect
GET    /auth/oauth/callback  - OAuth callback
```

### Database Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB
);

-- User roles junction
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);
```

---

## Technology Recommendations

| Component | Recommended | Alternatives |
|-----------|-------------|--------------|
| Framework | NestJS | Express, Fastify |
| Auth Library | Passport.js | Custom JWT |
| Password | bcrypt | argon2 |
| JWT | jsonwebtoken | jose |
| MFA | otplib | speakeasy |
| Database | PostgreSQL | MySQL |
| Cache | Redis | In-memory |

---

## Security Checklist

- [ ] Password hashing with bcrypt/argon2
- [ ] JWT with RS256 algorithm
- [ ] Refresh token rotation
- [ ] HTTPOnly secure cookies
- [ ] CSRF protection
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout mechanism
- [ ] Audit logging
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention

---

## Estimated Effort

| Phase | Duration |
|-------|----------|
| Requirements | 1-2 hours |
| Architecture | 2-3 hours |
| Development | 16-24 hours |
| Security Review | 2-4 hours |
| Testing | 4-8 hours |
| Deployment | 1-2 hours |
| **Total** | **26-43 hours** |

---

## Usage

To use this template, reference it in your SDLC start command:

```bash
/sdlc-start Build user authentication with OAuth and MFA, following templates/auth-system
```

The agents will use this template as a starting point and customize based on your specific requirements.
