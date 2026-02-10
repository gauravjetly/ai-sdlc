# Observability Stack - Production-Ready Implementation

## Overview

Comprehensive observability solution for the AI-SDLC Platform with Prometheus metrics, structured logging, health checks, and Grafana dashboards.

## Features

### 1. Prometheus Metrics (`metrics.service.ts`)

Production-ready metrics collection with automatic aggregation:

- **Deployment Metrics**: Success rate, duration, strategy performance
- **Resource Metrics**: CPU, memory, pod counts, node health
- **Cost Metrics**: Daily spend, monthly projections, optimization savings
- **Agent Metrics**: Execution time, success rates, queue length
- **Security Metrics**: Vulnerabilities, compliance scores
- **API Metrics**: Request rates, latency, error rates

#### Usage

```typescript
import { metricsService } from './observability';

// Start metrics collection (runs every 60 seconds by default)
metricsService.startCollection(60000);

// Manually increment counter
metricsService.incrementCounter('deployments_total');

// Set gauge value
metricsService.setGauge('pods_running', 15);

// Observe histogram value
metricsService.observeHistogram('deployment_duration_seconds', 145.5);

// Export metrics in Prometheus format
const prometheusFormat = metricsService.exportPrometheus();

// Export metrics as JSON
const jsonFormat = metricsService.exportJson();
```

#### API Endpoints

- `GET /api/v1/observability/metrics` - JSON format
- `GET /api/v1/observability/metrics/prometheus` - Prometheus format (scraping endpoint)

### 2. Enhanced Structured Logging (`logger.service.ts`)

Production-grade logging with correlation IDs and distributed tracing:

#### Features

- **Correlation IDs**: Track requests across services
- **Trace Context**: OpenTelemetry-compatible distributed tracing
- **Structured Logs**: JSON format for log aggregation (ELK, Splunk)
- **Multiple Transports**: Console, file, audit logs
- **Automatic Metadata**: Component, timestamp, correlation ID

#### Usage

```typescript
import { createEnhancedLogger } from './observability';

const logger = createEnhancedLogger('MyComponent');

// Set correlation ID for request tracing
logger.setCorrelationId('req-123-456');

// Basic logging
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.error('Failed to process payment', error, { orderId: '456' });

// Time operations
const result = await logger.timeAsync('fetchUserData', async () => {
  return await database.getUser(userId);
});

// HTTP request logging
logger.logHttpRequest('GET', '/api/users', 200, 145, { userId: '123' });

// Security event logging
logger.logSecurityEvent('Failed login attempt', 'medium', {
  userId: '123',
  ip: '192.168.1.1'
});

// Audit logging
logger.logAudit('DELETE', 'admin@example.com', 'user:123', 'success');
```

#### Express Middleware

```typescript
import { correlationIdMiddleware, requestLoggingMiddleware } from './observability';

app.use(correlationIdMiddleware());
app.use(requestLoggingMiddleware());

// In route handlers, access logger via req.logger
app.get('/users', (req, res) => {
  req.logger.info('Fetching users');
  // ...
});
```

#### Log Files

- `logs/combined.log` - All logs (JSON format)
- `logs/error.log` - Error logs only
- `logs/audit.log` - Audit trail (info and above)

### 3. Health Checks (`health.service.ts`)

Deep health checks for all system dependencies with proper timeouts:

#### Health Check Types

1. **Liveness**: Is the application running?
2. **Readiness**: Is the application ready to serve traffic?
3. **Startup**: Has the application finished initializing?
4. **System Health**: Comprehensive check of all components

#### Components Checked

- **PostgreSQL Database**: Connection pool status, query execution
- **Redis**: Ping, version info
- **Kubernetes API**: Namespace listing
- **AWS API**: Caller identity verification

#### Usage

```typescript
import { healthService } from './observability';

// Full system health
const systemHealth = await healthService.getSystemHealth();
// Returns: { status, timestamp, uptime_seconds, components, metrics }

// Kubernetes liveness probe
const liveness = await healthService.checkLiveness();

// Kubernetes readiness probe
const readiness = await healthService.checkReadiness();

// Kubernetes startup probe
const startup = await healthService.checkStartup();
```

#### API Endpoints

- `GET /health` - Simple health check (no auth required)
- `GET /api/v1/observability/health` - Full system health (auth required)
- `GET /api/v1/observability/health/live` - Liveness probe
- `GET /api/v1/observability/health/ready` - Readiness probe
- `GET /api/v1/observability/health/startup` - Startup probe

#### Health Status Values

- `healthy` - Component is fully operational
- `degraded` - Component is operational but with issues
- `unhealthy` - Component is not operational

### 4. Grafana Dashboards

Pre-built production dashboards for comprehensive monitoring:

#### Available Dashboards

1. **deployment-dashboard.json**
   - Deployment success rate
   - Active and in-progress deployments
   - Deployment duration percentiles (P50, P95, P99)
   - Deployments by environment and strategy
   - Deployment rate trends

2. **system-overview-dashboard.json**
   - System health status
   - CPU and memory usage
   - HTTP request rate and latency
   - Database and Redis metrics
   - Error rates by status code
   - Component health table

3. **cost-dashboard.json**
   - Daily and monthly cost tracking
   - Cost breakdown by cloud provider, environment, and service
   - Forecast accuracy
   - Optimization savings
   - Top cost contributors
   - Budget vs actual

#### Import to Grafana

```bash
# Option 1: Via Grafana UI
1. Open Grafana → Dashboards → Import
2. Upload JSON file from observability/dashboards/
3. Select Prometheus data source
4. Click Import

# Option 2: Via API
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <api-token>" \
  -d @observability/dashboards/deployment-dashboard.json
```

## Architecture

### Metrics Collection Flow

```
Application Code
    ↓
MetricsService.incrementCounter/setGauge/observeHistogram
    ↓
In-Memory Metrics Storage (Map)
    ↓
Periodic Collection (60s interval)
    ↓
Database Queries (Prisma)
    ↓
Metrics Updated
    ↓
/metrics/prometheus endpoint → Prometheus scrapes
```

### Logging Flow

```
Application Code
    ↓
EnhancedLogger.info/error/warn
    ↓
Correlation ID Injection
    ↓
Structured Log Format (JSON)
    ↓
Winston Transports
    ├─→ Console (human-readable)
    ├─→ logs/combined.log (JSON)
    ├─→ logs/error.log (errors only)
    └─→ logs/audit.log (audit trail)
    ↓
Log Aggregation (ELK, Splunk, etc.)
```

### Health Check Flow

```
Kubernetes/Load Balancer
    ↓
Health Check Endpoint (/health/ready)
    ↓
HealthService.checkReadiness()
    ↓
Parallel Checks (with 5s timeout)
    ├─→ Database: SELECT 1
    ├─→ Redis: PING
    ├─→ Kubernetes: list namespaces
    └─→ AWS: getCallerIdentity
    ↓
Aggregate Status (healthy/degraded/unhealthy)
    ↓
HTTP Response (200 or 503)
```

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info          # debug, info, warn, error
LOG_FORMAT=json         # json or pretty

# Metrics
METRICS_COLLECTION_INTERVAL=60000  # milliseconds

# Health Checks
HEALTH_CHECK_TIMEOUT=5000          # milliseconds

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Kubernetes
KUBECONFIG=/path/to/kubeconfig

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

## Kubernetes Integration

### Deployment with Health Checks

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aisdlc-platform
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: platform
        image: aisdlc-platform:latest
        ports:
        - containerPort: 3000

        # Liveness probe - restart if unhealthy
        livenessProbe:
          httpGet:
            path: /api/v1/observability/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3

        # Readiness probe - remove from service if not ready
        readinessProbe:
          httpGet:
            path: /api/v1/observability/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3

        # Startup probe - allow extra time for initialization
        startupProbe:
          httpGet:
            path: /api/v1/observability/health/startup
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 10
          failureThreshold: 30
```

### Prometheus ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: aisdlc-platform
spec:
  selector:
    matchLabels:
      app: aisdlc-platform
  endpoints:
  - port: http
    path: /api/v1/observability/metrics/prometheus
    interval: 30s
```

## Prometheus Configuration

### prometheus.yml

```yaml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  - job_name: 'aisdlc-platform'
    static_configs:
      - targets: ['platform-api:3000']
    metrics_path: '/api/v1/observability/metrics/prometheus'
```

## Alert Rules

### Example Prometheus Alert Rules

```yaml
groups:
  - name: aisdlc_platform
    interval: 30s
    rules:
      # Deployment alerts
      - alert: HighDeploymentFailureRate
        expr: (deployments_failed_total / deployments_total) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High deployment failure rate"
          description: "Deployment failure rate is {{ $value | humanizePercentage }}"

      # Resource alerts
      - alert: HighCPUUsage
        expr: cpu_usage_percent > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}%"

      # Cost alerts
      - alert: CostBudgetExceeded
        expr: cost_monthly_projection_usd > cost_monthly_budget_usd
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Monthly cost budget exceeded"
          description: "Projected cost ${{ $value }} exceeds budget"

      # Security alerts
      - alert: CriticalVulnerabilities
        expr: vulnerabilities_critical > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical vulnerabilities detected"
          description: "{{ $value }} critical vulnerabilities found"
```

## Best Practices

### Metrics

1. **Use appropriate metric types**:
   - Counter: Cumulative values that only increase (requests, errors)
   - Gauge: Values that can go up/down (CPU, memory, queue length)
   - Histogram: Distribution of values (latency, duration)

2. **Label cardinality**: Keep label values bounded to avoid memory issues

3. **Naming conventions**: Follow Prometheus naming (snake_case, units as suffix)

### Logging

1. **Use correlation IDs**: Track requests across services

2. **Structured logging**: Always log with metadata, not string concatenation

3. **Log levels**:
   - DEBUG: Detailed information for debugging
   - INFO: General informational messages
   - WARN: Warning messages for potential issues
   - ERROR: Error messages for failures
   - FATAL: Critical errors requiring immediate attention

4. **Don't log sensitive data**: PII, passwords, tokens

### Health Checks

1. **Liveness**: Should only fail if the application needs restart

2. **Readiness**: Should fail if dependencies are unavailable

3. **Timeouts**: Always use timeouts to prevent hanging

4. **Startup probe**: Allow enough time for slow startup

## Troubleshooting

### Metrics not appearing in Prometheus

1. Check Prometheus is scraping: `http://prometheus:9090/targets`
2. Verify endpoint returns data: `curl http://platform:3000/api/v1/observability/metrics/prometheus`
3. Check firewall rules allow Prometheus to reach the platform

### Health checks failing

1. Check component connectivity:
   ```bash
   # Database
   psql $DATABASE_URL -c "SELECT 1"

   # Redis
   redis-cli -u $REDIS_URL PING

   # Kubernetes
   kubectl get namespaces

   # AWS
   aws sts get-caller-identity
   ```

2. Increase timeout if checks are timing out

### Logs not structured

1. Verify LOG_FORMAT=json in environment
2. Check Winston transports are configured correctly
3. Ensure correlation ID middleware is loaded

## Performance Considerations

### Metrics Collection

- Default 60-second interval is suitable for most use cases
- Reduce interval for faster updates (minimum 10 seconds recommended)
- Increase interval to reduce database load

### Logging

- Structured JSON logging has minimal overhead (<5ms per log)
- File rotation prevents disk space issues
- Consider log aggregation for large deployments

### Health Checks

- All checks have 5-second timeouts
- Checks run in parallel for faster response
- Cached results for terminal states (completed, failed)

## Integration with Atlas Agent Memory

The observability stack automatically captures learnings for the Atlas agent:

```json
{
  "patterns": {
    "deployment_duration": "P95: 145s, P99: 234s",
    "success_rate_by_strategy": {
      "rolling": "98.5%",
      "blue_green": "99.2%",
      "canary": "99.8%"
    }
  },
  "incidents": {
    "high_cpu": "Resolved by horizontal scaling",
    "deployment_timeout": "Increased health check timeout to 60s"
  }
}
```

## Next Steps

1. **Set up Prometheus**: Deploy Prometheus to scrape metrics
2. **Configure Grafana**: Import dashboards and connect to Prometheus
3. **Set up alerts**: Configure Alertmanager with notification channels
4. **Log aggregation**: Set up ELK stack or Splunk for centralized logging
5. **Distributed tracing**: Integrate OpenTelemetry for full tracing

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review health check status at `/api/v1/observability/health`
- Examine metrics at `/api/v1/observability/metrics/prometheus`
