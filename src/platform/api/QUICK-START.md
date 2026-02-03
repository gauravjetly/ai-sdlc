# API Quick Start Guide

## 30-Second Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate JWT keys
npm run setup:jwt

# 3. Start API server
npm run api:dev

# 4. Open browser
open http://localhost:3000/api-docs
```

## 5-Minute Tutorial

### Step 1: Health Check (No Auth)

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 45,
    "timestamp": "2024-01-29T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### Step 2: Create Deployment (Dev Mode - No Auth Required)

```bash
curl -X POST http://localhost:3000/api/v1/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "hello-world",
    "environment": "dev",
    "version": "1.0.0",
    "image": "hello-world:1.0.0",
    "cluster": "dev-cluster",
    "replicas": 2
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "deploy-1706529600-xyz123",
    "name": "hello-world",
    "environment": "dev",
    "version": "1.0.0",
    "status": "pending",
    "replicas": 2,
    "strategy": "rolling",
    "createdAt": "2024-01-29T12:00:00.000Z",
    "updatedAt": "2024-01-29T12:00:00.000Z",
    "createdBy": "dev@example.com"
  }
}
```

### Step 3: List All Deployments

```bash
curl http://localhost:3000/api/v1/deployments
```

### Step 4: Get Deployment Details

```bash
curl http://localhost:3000/api/v1/deployments/deploy-1706529600-xyz123
```

### Step 5: Scale Deployment

```bash
curl -X POST http://localhost:3000/api/v1/deployments/deploy-1706529600-xyz123/scale \
  -H "Content-Type: application/json" \
  -d '{"replicas": 5}'
```

### Step 6: View Logs

```bash
curl "http://localhost:3000/api/v1/deployments/deploy-1706529600-xyz123/logs?lines=10"
```

### Step 7: Get Metrics

```bash
curl http://localhost:3000/api/v1/deployments/deploy-1706529600-xyz123/metrics
```

## Common Operations

### Infrastructure

```bash
# Provision infrastructure
curl -X POST http://localhost:3000/api/v1/infrastructure/provision \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "aws",
    "region": "us-east-1",
    "resources": [
      {
        "type": "virtual_network",
        "name": "my-vpc",
        "config": {"cidr": "10.0.0.0/16"}
      }
    ]
  }'

# List infrastructure
curl http://localhost:3000/api/v1/infrastructure

# Get supported clouds
curl http://localhost:3000/api/v1/infrastructure/clouds
```

### Security

```bash
# Run security scan
curl -X POST http://localhost:3000/api/v1/security/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "hello-world:1.0.0",
    "scanType": "vulnerability"
  }'

# Get vulnerabilities
curl http://localhost:3000/api/v1/security/vulnerabilities

# Check compliance
curl http://localhost:3000/api/v1/security/compliance
```

### Costs

```bash
# Get current costs
curl http://localhost:3000/api/v1/costs

# Get cost forecast
curl "http://localhost:3000/api/v1/costs/forecast?horizon=month"

# Get optimization recommendations
curl -X POST http://localhost:3000/api/v1/costs/optimize
```

### Observability

```bash
# Platform health
curl http://localhost:3000/api/v1/observability/health

# Query logs
curl "http://localhost:3000/api/v1/observability/logs?limit=10"

# Create alert
curl -X POST http://localhost:3000/api/v1/observability/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High CPU Alert",
    "condition": "cpu > 80",
    "threshold": 80,
    "severity": "warning"
  }'
```

### Testing

```bash
# Run tests
curl -X POST http://localhost:3000/api/v1/tests/run \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "integration",
    "environment": "dev"
  }'

# Get coverage
curl http://localhost:3000/api/v1/tests/coverage
```

### Releases

```bash
# Plan release
curl -X POST http://localhost:3000/api/v1/releases \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Release 1.0.0",
    "version": "1.0.0",
    "environment": "prod",
    "deployments": ["deploy-123"]
  }'

# View release calendar
curl http://localhost:3000/api/v1/releases/calendar
```

### Architecture

```bash
# List architecture patterns
curl http://localhost:3000/api/v1/architecture/patterns

# Create ADR
curl -X POST http://localhost:3000/api/v1/architecture/adrs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Use PostgreSQL for primary database",
    "status": "accepted",
    "context": "Need reliable ACID database",
    "decision": "Choose PostgreSQL",
    "consequences": ["Excellent reliability", "Strong community"]
  }'
```

## Useful Commands

```bash
# Start API server
npm run api:start

# Start with hot reload
npm run api:dev

# Run tests
npm run test:api

# Type check
npm run type-check

# Lint code
npm run lint

# Generate JWT keys
npm run setup:jwt
```

## Environment Variables

```bash
# Server
export PORT=3000
export NODE_ENV=development

# JWT Keys
export JWT_PUBLIC_KEY_PATH=/path/to/public.key
export JWT_PRIVATE_KEY_PATH=/path/to/private.key

# Logging
export LOG_LEVEL=info

# CORS
export CORS_ORIGIN=https://app.example.com
```

## Production Authentication

In production, include JWT token:

```bash
# Set token
export TOKEN="your-jwt-token"

# Make authenticated request
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/v1/deployments
```

## API Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **API Reference**: `/api/docs/API-REFERENCE.md`
- **Full README**: `/api/README.md`

## Error Handling

All errors follow this format:

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

Common error codes:
- `AUTH_REQUIRED` (401)
- `INVALID_TOKEN` (403)
- `VALIDATION_FAILED` (400)
- `NOT_FOUND` (404)
- `RATE_LIMIT_EXCEEDED` (429)

## Rate Limits

- Standard: 100 req/min
- Read: 300 req/min
- Write: 30 req/min
- Expensive: 10 req/min

Headers show remaining quota:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1643462400
```

## Testing

```bash
# Run all tests
npm test

# Run API tests only
npm run test:api

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Troubleshooting

### Port in use
```bash
PORT=3001 npm run api:start
```

### JWT keys not found
```bash
npm run setup:jwt
```

### Rate limit exceeded
Wait 60 seconds or modify limits in `middleware/rateLimit.middleware.ts`

## Next Steps

1. Explore Swagger UI: http://localhost:3000/api-docs
2. Read full documentation: `/api/README.md`
3. View API reference: `/api/docs/API-REFERENCE.md`
4. Run integration tests: `npm run test:api`

## Support

- Documentation: http://localhost:3000/api-docs
- Issues: Create GitHub issue
- Questions: Team chat

---

**Happy Coding!** 🚀
