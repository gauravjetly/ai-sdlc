# Observability Stack - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Start Metrics Collection

```typescript
import { initializeObservability } from './observability/startup';

// In your application startup
await initializeObservability();
```

### 2. Add Logging to Your Code

```typescript
import { createEnhancedLogger } from './observability';

const logger = createEnhancedLogger('YourComponent');

logger.info('Operation completed', { userId: '123', duration: 1500 });
logger.error('Operation failed', error, { context: 'payment' });
```

### 3. Test Health Endpoints

```bash
# Liveness (is it running?)
curl http://localhost:3000/api/v1/observability/health/live

# Readiness (ready for traffic?)
curl http://localhost:3000/api/v1/observability/health/ready

# Full system health
curl http://localhost:3000/api/v1/observability/health
```

### 4. View Metrics

```bash
# JSON format
curl http://localhost:3000/api/v1/observability/metrics

# Prometheus format (for scraping)
curl http://localhost:3000/api/v1/observability/metrics/prometheus
```

---

## 📊 Quick Metrics Reference

### Increment a Counter
```typescript
import { metricsService } from './observability';

metricsService.incrementCounter('deployments_total');
metricsService.incrementCounter('deployments_success_total');
```

### Set a Gauge
```typescript
metricsService.setGauge('pods_running', 15);
metricsService.setGauge('cpu_usage_percent', 45.2);
```

### Observe a Histogram (for durations)
```typescript
const startTime = Date.now();
// ... do something
const duration = (Date.now() - startTime) / 1000; // seconds
metricsService.observeHistogram('deployment_duration_seconds', duration);
```

---

## 📝 Quick Logging Reference

### Basic Logging
```typescript
logger.info('User logged in', { userId: '123' });
logger.warn('Rate limit approaching', { current: 95, limit: 100 });
logger.error('Database connection failed', error);
```

### Time Operations
```typescript
const result = await logger.timeAsync('fetchUserData', async () => {
  return await database.getUser(userId);
});
// Automatically logs duration
```

### HTTP Requests (use middleware)
```typescript
import { correlationIdMiddleware, requestLoggingMiddleware } from './observability';

app.use(correlationIdMiddleware());
app.use(requestLoggingMiddleware());
// Automatically logs all HTTP requests with correlation IDs
```

---

## 🏥 Health Check Integration

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        livenessProbe:
          httpGet:
            path: /api/v1/observability/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/observability/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        startupProbe:
          httpGet:
            path: /api/v1/observability/health/startup
            port: 3000
          failureThreshold: 30
          periodSeconds: 10
```

---

## 📈 Prometheus Setup

### 1. Configure Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'aisdlc-platform'
    static_configs:
      - targets: ['platform-api:3000']
    metrics_path: '/api/v1/observability/metrics/prometheus'
    scrape_interval: 30s
```

### 2. ServiceMonitor (if using Prometheus Operator)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: aisdlc-platform
spec:
  endpoints:
  - port: http
    path: /api/v1/observability/metrics/prometheus
    interval: 30s
```

---

## 📊 Grafana Setup

### Import Dashboards

1. Open Grafana → Dashboards → Import
2. Upload JSON file from `observability/dashboards/`
3. Select Prometheus data source
4. Click Import

**Available Dashboards:**
- `deployment-dashboard.json` - Deployment metrics
- `system-overview-dashboard.json` - System health
- `cost-dashboard.json` - Cost tracking

---

## ⚙️ Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Optional (with defaults)
LOG_LEVEL=info                      # debug, info, warn, error
LOG_FORMAT=json                     # json or pretty
METRICS_COLLECTION_INTERVAL=60000   # milliseconds
HEALTH_CHECK_TIMEOUT=5000           # milliseconds
```

---

## 🔍 Troubleshooting

### Metrics not appearing?

```bash
# Check endpoint
curl http://localhost:3000/api/v1/observability/metrics/prometheus

# Should return Prometheus format:
# HELP deployments_total Total number of deployments
# TYPE deployments_total counter
# deployments_total 42
```

### Health checks failing?

```bash
# Check each component
curl http://localhost:3000/api/v1/observability/health

# Test database
psql $DATABASE_URL -c "SELECT 1"

# Test Redis
redis-cli -u $REDIS_URL PING
```

### Logs not structured?

```bash
# Check log format
tail -f logs/combined.log

# Should be JSON:
# {"level":"info","message":"...","timestamp":"...","correlation_id":"..."}
```

---

## 📚 Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `deployments_total` | Counter | Total deployments |
| `deployments_success_total` | Counter | Successful deployments |
| `deployments_failed_total` | Counter | Failed deployments |
| `deployments_active` | Gauge | Currently active |
| `cpu_usage_percent` | Gauge | CPU usage |
| `memory_usage_bytes` | Gauge | Memory usage |
| `pods_running` | Gauge | Running pods |
| `cost_daily_usd` | Gauge | Daily cost |
| `vulnerabilities_critical` | Gauge | Critical CVEs |
| `http_requests_total` | Counter | Total HTTP requests |

**Full list**: See `observability/types.ts`

---

## 🎯 Common Use Cases

### Track Deployment Success

```typescript
// Start deployment
metricsService.incrementCounter('deployments_total');
metricsService.incrementCounter('deployments_in_progress');

try {
  await deploy();
  metricsService.incrementCounter('deployments_success_total');
} catch (error) {
  metricsService.incrementCounter('deployments_failed_total');
} finally {
  metricsService.decrementGauge('deployments_in_progress');
}
```

### Log with Request Tracing

```typescript
app.post('/deploy', async (req, res) => {
  const logger = req.logger; // Injected by middleware

  logger.info('Deployment started', {
    environment: req.body.environment,
    version: req.body.version
  });

  // Correlation ID automatically included
  await deploymentService.deploy(req.body);

  logger.info('Deployment completed');
});
```

### Monitor Service Health

```typescript
// In your service
const health = await healthService.checkReadiness();

if (health.status !== 'healthy') {
  logger.error('Service not ready', { health });
  // Don't start accepting traffic
}
```

---

## 🔐 Security Notes

- Health endpoints require authentication (except `/health`)
- Metrics endpoints require `metrics:read` permission
- Correlation IDs are automatically generated (UUIDs)
- Logs never include sensitive data (PII, passwords, tokens)

---

## 📖 Full Documentation

For comprehensive documentation, see:
- **Full guide**: `observability/README.md`
- **Implementation details**: `observability/IMPLEMENTATION-COMPLETE.md`
- **API docs**: Swagger UI at `/api-docs`

---

## 🆘 Support

**Issue**: Metrics not collecting
**Solution**: Check `METRICS_COLLECTION_INTERVAL` and database connectivity

**Issue**: Health checks timeout
**Solution**: Increase `HEALTH_CHECK_TIMEOUT` or check network latency

**Issue**: Logs too verbose
**Solution**: Set `LOG_LEVEL=warn` in production

---

**Version**: 1.0.0
**Last Updated**: 2026-01-30
**Status**: Production-Ready ✅
