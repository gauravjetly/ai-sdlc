# Multi-Cloud Platform API Reference

## Overview

Complete REST API with **102 endpoints** across 8 categories for comprehensive multi-cloud platform operations.

**Base URL**: `http://localhost:3000/api/v1`

**Authentication**: JWT Bearer token (RS256)

**Rate Limits**:
- Standard: 100 req/min
- Read operations: 300 req/min
- Write operations: 30 req/min
- Expensive operations: 10 req/min

## Quick Start

### 1. Authentication

```bash
# Get JWT token (implement your own auth service)
export TOKEN="your-jwt-token-here"

# Make authenticated request
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/v1/deployments
```

### 2. Example Request

```bash
# Create a deployment
curl -X POST http://localhost:3000/api/v1/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "environment": "dev",
    "version": "1.0.0",
    "image": "my-app:1.0.0",
    "cluster": "dev-cluster",
    "replicas": 3
  }'
```

## API Categories

### 1. Deployments (15 endpoints)

Manage application deployments across environments.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/deployments` | Create deployment |
| GET | `/deployments` | List deployments |
| GET | `/deployments/:id` | Get deployment details |
| GET | `/deployments/:id/status` | Get deployment status |
| GET | `/deployments/:id/logs` | Get deployment logs |
| POST | `/deployments/:id/rollback` | Rollback deployment |
| DELETE | `/deployments/:id` | Delete deployment |
| GET | `/deployments/:id/history` | Deployment history |
| POST | `/deployments/:id/scale` | Scale deployment |
| POST | `/deployments/:id/restart` | Restart deployment |
| GET | `/deployments/:id/metrics` | Deployment metrics |
| GET | `/deployments/:id/events` | Deployment events |
| POST | `/deployments/:id/approve` | Approve deployment |
| POST | `/deployments/:id/promote` | Promote to next env |
| GET | `/deployments/environments/:env` | List by environment |

### 2. Infrastructure (15 endpoints)

Provision and manage cloud infrastructure.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/infrastructure/provision` | Provision infrastructure |
| GET | `/infrastructure` | List infrastructure |
| GET | `/infrastructure/:id` | Get infrastructure details |
| DELETE | `/infrastructure/:id` | Destroy infrastructure |
| POST | `/infrastructure/:id/scale` | Scale resources |
| GET | `/infrastructure/:id/status` | Infrastructure status |
| GET | `/infrastructure/inventory` | Complete inventory |
| POST | `/infrastructure/configure` | Configure resource |
| GET | `/infrastructure/clouds` | List supported clouds |
| GET | `/infrastructure/regions` | List regions |
| GET | `/infrastructure/costs` | Infrastructure costs |
| POST | `/infrastructure/validate` | Validate config |
| GET | `/infrastructure/templates` | Infrastructure templates |
| POST | `/infrastructure/import` | Import existing infra |
| GET | `/infrastructure/:id/topology` | Infrastructure diagram |

### 3. Security (15 endpoints)

Security scanning, vulnerability management, and compliance.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/security/scan` | Run security scan |
| GET | `/security/scans` | List scans |
| GET | `/security/scans/:id` | Get scan results |
| GET | `/security/vulnerabilities` | List vulnerabilities |
| GET | `/security/vulnerabilities/:id` | Vulnerability details |
| POST | `/security/patch` | Apply security patch |
| GET | `/security/compliance` | Compliance status |
| POST | `/security/audit` | Run compliance audit |
| GET | `/security/policies` | List security policies |
| POST | `/security/policies` | Create security policy |
| GET | `/security/secrets` | List secrets |
| POST | `/security/secrets` | Create secret |
| PUT | `/security/secrets/:id` | Update secret |
| POST | `/security/secrets/:id/rotate` | Rotate secret |
| GET | `/security/access-logs` | Access audit logs |

### 4. Costs (12 endpoints)

Cost analysis, forecasting, and optimization.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/costs` | Current costs |
| GET | `/costs/history` | Cost history |
| GET | `/costs/forecast` | Cost forecast |
| POST | `/costs/analyze` | Analyze costs |
| POST | `/costs/optimize` | Get optimization recommendations |
| GET | `/costs/budgets` | List budgets |
| POST | `/costs/budgets` | Create budget |
| PUT | `/costs/budgets/:id` | Update budget |
| GET | `/costs/alerts` | Cost alerts |
| GET | `/costs/breakdown` | Cost breakdown by service |
| GET | `/costs/tags` | Cost by tags |
| POST | `/costs/report` | Generate cost report |

### 5. Observability (15 endpoints)

Metrics, logs, traces, and monitoring.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/observability/metrics` | Query metrics |
| GET | `/observability/metrics/dashboards` | List dashboards |
| GET | `/observability/logs` | Query logs |
| POST | `/observability/logs/search` | Search logs |
| GET | `/observability/traces` | Get distributed traces |
| GET | `/observability/traces/:id` | Trace details |
| GET | `/observability/alerts` | List alerts |
| POST | `/observability/alerts` | Create alert |
| PUT | `/observability/alerts/:id` | Update alert |
| DELETE | `/observability/alerts/:id` | Delete alert |
| GET | `/observability/health` | Platform health |
| GET | `/observability/health/services` | Service health |
| POST | `/observability/incidents` | Create incident |
| GET | `/observability/incidents` | List incidents |
| GET | `/observability/incidents/:id` | Incident details |

### 6. Testing (10 endpoints)

Test execution, coverage, and reporting.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tests/run` | Run tests |
| GET | `/tests` | List test runs |
| GET | `/tests/:id` | Test run details |
| GET | `/tests/:id/results` | Test results |
| GET | `/tests/coverage` | Test coverage |
| POST | `/tests/performance` | Run performance tests |
| GET | `/tests/suites` | List test suites |
| POST | `/tests/suites` | Create test suite |
| GET | `/tests/reports` | Test reports |
| POST | `/tests/validate` | Validate deployment |

### 7. Releases (10 endpoints)

Release planning and management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/releases` | Plan release |
| GET | `/releases` | List releases |
| GET | `/releases/:id` | Release details |
| POST | `/releases/:id/execute` | Execute release |
| POST | `/releases/:id/rollback` | Rollback release |
| GET | `/releases/:id/notes` | Release notes |
| POST | `/releases/:id/approve` | Approve release |
| GET | `/releases/calendar` | Release calendar |
| GET | `/releases/environments` | Releases by environment |
| POST | `/releases/:id/notifications` | Send notifications |

### 8. Architecture (10 endpoints)

Architecture reviews, ADRs, and tech stack management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/architecture/review` | Submit for review |
| GET | `/architecture/reviews` | List reviews |
| GET | `/architecture/reviews/:id` | Review details |
| POST | `/architecture/adrs` | Create ADR |
| GET | `/architecture/adrs` | List ADRs |
| GET | `/architecture/adrs/:id` | ADR details |
| POST | `/architecture/diagram` | Generate diagram |
| GET | `/architecture/patterns` | List patterns |
| POST | `/architecture/evaluate` | Evaluate tech stack |
| GET | `/architecture/dependencies` | Dependency graph |

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [
      {
        "field": "name",
        "code": "string.min",
        "message": "name must be at least 3 characters"
      }
    ],
    "traceId": "abc123",
    "timestamp": "2024-01-29T12:00:00.000Z"
  }
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | No authentication provided |
| `INVALID_TOKEN` | 403 | JWT token is invalid |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `VALIDATION_FAILED` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Permissions

### RBAC Roles

| Role | Permissions |
|------|-------------|
| `admin` | All permissions (`*`) |
| `operator` | Deploy, manage infrastructure, view all |
| `developer` | Create deployments, view logs/metrics |
| `viewer` | Read-only access to all resources |

### Permission Format

Format: `resource:action`

Examples:
- `deployments:create`
- `deployments:read`
- `infrastructure:*` (all infrastructure permissions)
- `*` (all permissions - admin only)

## Rate Limiting

Rate limits are enforced per IP address:

| Endpoint Type | Limit |
|---------------|-------|
| Auth endpoints | 5 req / 15 min |
| Read operations | 300 req / min |
| Write operations | 30 req / min |
| Expensive ops (provision, scan) | 10 req / min |
| Standard | 100 req / min |

Rate limit headers:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1643462400
```

## Pagination

Pagination parameters (query string):

```
?page=1&limit=20&sort=createdAt&order=desc
```

Response includes pagination metadata:

```json
{
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

## Swagger UI

Interactive API documentation available at:

**Development**: http://localhost:3000/api-docs

Swagger UI provides:
- Complete API reference
- Try-it-out functionality
- Request/response examples
- Schema definitions

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`
  }
});

// Create deployment
const deployment = await api.post('/deployments', {
  name: 'my-app',
  environment: 'dev',
  version: '1.0.0',
  image: 'my-app:1.0.0',
  cluster: 'dev-cluster'
});

// Get deployment status
const status = await api.get(`/deployments/${deployment.data.data.id}/status`);
```

### Python

```python
import requests

API_URL = 'http://localhost:3000/api/v1'
TOKEN = 'your-token-here'

headers = {'Authorization': f'Bearer {TOKEN}'}

# Create deployment
response = requests.post(
    f'{API_URL}/deployments',
    json={
        'name': 'my-app',
        'environment': 'dev',
        'version': '1.0.0',
        'image': 'my-app:1.0.0',
        'cluster': 'dev-cluster'
    },
    headers=headers
)

deployment = response.json()['data']
```

### cURL

```bash
# Set token
TOKEN="your-token-here"

# Create deployment
curl -X POST http://localhost:3000/api/v1/deployments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "name": "my-app",
  "environment": "dev",
  "version": "1.0.0",
  "image": "my-app:1.0.0",
  "cluster": "dev-cluster",
  "replicas": 3
}
EOF
```

## Support

- Documentation: `/api-docs`
- Health check: `/health`
- API version: `/api/v1`
