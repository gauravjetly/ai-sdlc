# Microservice Template

## Overview
Production-ready microservice with health checks, observability, and container deployment.

## Quick Start
```bash
/sdlc-start Build [service-name] microservice using template: templates/microservice
```

## Features Included

### Core Features
- RESTful API endpoints
- Health check endpoints
- Configuration management
- Graceful shutdown

### Observability
- Structured logging
- Metrics endpoint (Prometheus)
- Distributed tracing (OpenTelemetry)
- Health checks (liveness/readiness)

### Containerization
- Dockerfile (multi-stage)
- Docker Compose for local dev
- Kubernetes manifests
- Helm chart (optional)

### Resilience
- Circuit breaker pattern
- Retry with exponential backoff
- Timeout handling
- Bulkhead isolation

---

## Pre-defined Requirements

### Functional Requirements

```markdown
## FR-SVC-001: Core Business Logic
The service shall implement [specific business capability].

## FR-SVC-002: API Contracts
The service shall expose RESTful APIs with OpenAPI documentation.

## FR-SVC-003: Event Publishing
The service shall publish domain events for state changes.

## FR-SVC-004: Event Consumption
The service shall consume events from relevant topics.
```

### Non-Functional Requirements

```markdown
## NFR-SVC-001: Performance
- P95 latency < 100ms for read operations
- P95 latency < 500ms for write operations
- Support 500 RPS per instance

## NFR-SVC-002: Availability
- 99.9% uptime target
- Graceful degradation on dependency failures
- Health checks respond within 5 seconds

## NFR-SVC-003: Scalability
- Horizontal scaling via replicas
- Stateless design
- Support auto-scaling based on CPU/memory

## NFR-SVC-004: Observability
- Structured JSON logging
- Request tracing with correlation IDs
- Metrics exposed on /metrics endpoint
```

---

## Suggested Architecture

### Project Structure
```
service-name/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Root module
│   ├── config/
│   │   └── configuration.ts    # Config management
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   ├── domain/
│   │   ├── entities/
│   │   ├── services/
│   │   └── repositories/
│   ├── application/
│   │   ├── use-cases/
│   │   └── dto/
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── messaging/
│   │   └── external/
│   └── presentation/
│       ├── controllers/
│       └── middleware/
├── test/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── docker-compose.yml
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
└── package.json
```

### API Endpoints
```
# Health endpoints
GET  /health          - Basic liveness
GET  /health/ready    - Readiness (dependencies)
GET  /health/startup  - Startup probe

# Metrics
GET  /metrics         - Prometheus metrics

# Business endpoints
[Define based on service domain]
```

### Health Check Implementation
```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

---

## Containerization

### Dockerfile
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-name
spec:
  replicas: 3
  selector:
    matchLabels:
      app: service-name
  template:
    spec:
      containers:
      - name: service-name
        image: service-name:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        env:
        - name: NODE_ENV
          value: production
```

---

## Configuration

### Environment Variables
```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# External Services
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
```

### Configuration Schema
```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});
```

---

## Observability

### Logging Format
```json
{
  "timestamp": "2026-01-20T10:00:00.000Z",
  "level": "info",
  "traceId": "abc123",
  "spanId": "def456",
  "service": "service-name",
  "message": "Request processed",
  "method": "GET",
  "path": "/api/resource",
  "statusCode": 200,
  "duration": 45
}
```

### Key Metrics
```
# HTTP metrics
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}

# Business metrics
[service]_operations_total{operation, status}
[service]_operation_duration_seconds{operation}

# Infrastructure metrics
nodejs_heap_size_bytes
nodejs_active_handles
```

---

## Resilience Patterns

### Circuit Breaker
```typescript
@Injectable()
export class ExternalService {
  private circuitBreaker = new CircuitBreaker({
    timeout: 3000,
    errorThreshold: 50,
    resetTimeout: 30000,
  });

  async call() {
    return this.circuitBreaker.fire(() =>
      this.httpService.get('/external')
    );
  }
}
```

### Retry Pattern
```typescript
async callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
}
```

---

## Estimated Effort

| Phase | Duration |
|-------|----------|
| Requirements | 1-2 hours |
| Architecture | 2-4 hours |
| Development | 8-16 hours |
| Security Review | 2-3 hours |
| Testing | 4-6 hours |
| Deployment | 2-4 hours |
| **Total** | **19-35 hours** |

---

## Usage

```bash
/sdlc-start Build order-processing microservice with Kafka integration, following templates/microservice
```
