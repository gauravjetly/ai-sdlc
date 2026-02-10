# ADR-020: Monitoring and Observability

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Operations

---

## Context

The Deltek Catalyst platform requires comprehensive observability for:

- **Metrics**: System performance, business KPIs, SLO tracking
- **Logging**: Application logs, audit trails, debugging
- **Tracing**: Distributed request tracing across services
- **Alerting**: Proactive incident detection and notification
- **Dashboards**: Real-time visibility for operations and business

Requirements:
- Support for 10,000+ concurrent users
- Sub-second query latency for operational dashboards
- 30-day hot retention, 1-year cold retention for logs
- Multi-tenant isolation in observability data
- Integration with existing enterprise tools (PagerDuty, Slack, Teams)

## Decision

**We will implement a comprehensive observability stack** based on open standards:

### Observability Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| Metrics | Prometheus + Thanos | Time-series metrics, long-term storage |
| Logging | Fluentd + Elasticsearch + Kibana | Log aggregation and search |
| Tracing | OpenTelemetry + Jaeger/Tempo | Distributed tracing |
| Alerting | Alertmanager + PagerDuty | Incident management |
| Dashboards | Grafana | Unified visualization |
| APM | OpenTelemetry | Application performance monitoring |

### Architecture

```
+------------------------------------------------------------------+
|                    OBSERVABILITY ARCHITECTURE                     |
+------------------------------------------------------------------+
|                                                                   |
|  INSTRUMENTATION LAYER                                            |
|  +------------------------------------------------------------+  |
|  |              OpenTelemetry SDK (All Services)               |  |
|  |  Metrics | Traces | Logs | Baggage Propagation              |  |
|  +------------------------------------------------------------+  |
|                              |                                    |
|                              v                                    |
|  +------------------------------------------------------------+  |
|  |              OpenTelemetry Collector                        |  |
|  |  Receivers | Processors | Exporters                         |  |
|  +------------------------------------------------------------+  |
|       |              |              |              |              |
|       v              v              v              v              |
|  +--------+    +--------+    +--------+    +--------+           |
|  |Prometheus|  | Jaeger/ |  |Elasticsearch| Alertmanager|       |
|  | /Thanos |  | Tempo   |  | /Loki   |    |            |       |
|  +--------+    +--------+    +--------+    +--------+           |
|       |              |              |              |              |
|       +-------+------+------+------+------+-------+              |
|               |             |             |                       |
|               v             v             v                       |
|         +-----------------------------------------+              |
|         |              GRAFANA                    |              |
|         |  Dashboards | Alerts | Explore         |              |
|         +-----------------------------------------+              |
|                              |                                    |
|                              v                                    |
|         +-----------------------------------------+              |
|         |          INCIDENT MANAGEMENT            |              |
|         |  PagerDuty | Slack | Teams | Email     |              |
|         +-----------------------------------------+              |
|                                                                   |
+------------------------------------------------------------------+
```

### Metrics Strategy

**Key Metrics Categories**:

```yaml
# Infrastructure Metrics (via Prometheus)
infrastructure:
  - container_cpu_usage_seconds_total
  - container_memory_usage_bytes
  - node_disk_io_time_seconds_total
  - node_network_receive_bytes_total

# Application Metrics (custom)
application:
  # RED metrics (Rate, Errors, Duration)
  - http_requests_total{method, path, status, tenant_id}
  - http_request_duration_seconds{method, path, tenant_id}
  - http_request_errors_total{method, path, error_type, tenant_id}

  # Business metrics
  - deployments_total{environment, cloud, status, tenant_id}
  - deployment_duration_seconds{environment, cloud, tenant_id}
  - agent_executions_total{agent_id, status, tenant_id}
  - cost_optimization_savings_dollars{tenant_id}

  # SLO metrics
  - slo_availability_ratio{service}
  - slo_latency_ratio{service}
  - error_budget_remaining{service}
```

### Logging Strategy

**Log Format (JSON)**:

```json
{
  "timestamp": "2026-01-30T10:00:00.000Z",
  "level": "info",
  "service": "catalyst-api",
  "tenant_id": "tenant-123",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "user_id": "user-456",
  "message": "Deployment created successfully",
  "context": {
    "deployment_id": "deploy-789",
    "environment": "production",
    "cloud_provider": "aws"
  },
  "duration_ms": 245
}
```

### Tracing Strategy

**Trace Context Propagation**:

```typescript
// W3C Trace Context headers
'traceparent': '00-<trace_id>-<span_id>-01'
'tracestate': 'catalyst=<catalyst_specific_context>'

// Custom context
'x-tenant-id': '<tenant_id>'
'x-request-id': '<request_id>'
```

## Alternatives Considered

### Metrics Stack

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Prometheus + Thanos** | OSS, PromQL, scalable | Complex setup | **Selected** |
| Datadog | Fully managed | Cost, vendor lock-in | Rejected |
| Victoria Metrics | Better performance | Less ecosystem | Alternative |
| InfluxDB | Purpose-built | Different query language | Rejected |

### Logging Stack

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **EFK (Elasticsearch)** | Full-text search | Resource intensive | **Selected** |
| Loki | Lightweight | Less feature-rich | Alternative |
| Splunk | Enterprise features | Very expensive | Rejected |
| CloudWatch Logs | Managed | AWS lock-in | Rejected |

### Tracing

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Jaeger** | CNCF, mature | Scaling complexity | **Selected** |
| Tempo | Grafana native | Less mature | Alternative |
| Zipkin | Simple | Less features | Rejected |
| X-Ray | AWS native | AWS only | Rejected |

## Consequences

### Positive

1. **Open Standards**: OpenTelemetry ensures vendor flexibility
2. **Unified View**: Grafana correlates metrics, logs, traces
3. **Cost Control**: OSS stack, no per-host pricing
4. **Scalability**: Thanos enables multi-cluster scaling
5. **Multi-tenant**: Tenant labels enable isolation

### Negative

1. **Operational Overhead**: Multiple systems to manage
2. **Learning Curve**: Team needs observability training
3. **Storage Costs**: High-cardinality metrics can be expensive

### Mitigations

1. **Managed Services**: Use managed Prometheus, Elasticsearch where available
2. **Training**: Observability workshops for engineering team
3. **Cardinality Management**: Label guidelines and alerts

## Implementation Details

### OpenTelemetry Instrumentation

```typescript
// src/infrastructure/observability/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'catalyst-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/metrics',
    }),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/health', '/metrics'],
      },
      '@opentelemetry/instrumentation-express': {},
      '@opentelemetry/instrumentation-pg': {},
      '@opentelemetry/instrumentation-redis': {},
    }),
  ],
});

sdk.start();
```

### Custom Metrics

```typescript
// src/infrastructure/observability/metrics.ts
import { metrics } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const meter = metrics.getMeter('catalyst-api');

// HTTP request metrics
export const httpRequestsTotal = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

export const httpRequestDuration = meter.createHistogram('http_request_duration_seconds', {
  description: 'HTTP request duration in seconds',
  boundaries: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Business metrics
export const deploymentsTotal = meter.createCounter('deployments_total', {
  description: 'Total number of deployments',
});

export const deploymentDuration = meter.createHistogram('deployment_duration_seconds', {
  description: 'Deployment duration in seconds',
});

export const agentExecutionsTotal = meter.createCounter('agent_executions_total', {
  description: 'Total number of agent executions',
});

// Usage in middleware
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode.toString(),
      tenant_id: req.tenant?.id || 'unknown',
    };

    httpRequestsTotal.add(1, labels);
    httpRequestDuration.record(duration, labels);
  });

  next();
};
```

### Structured Logging

```typescript
// src/infrastructure/observability/logger.ts
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

export const createLogger = (service: string) => {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    mixin: () => {
      const span = trace.getSpan(context.active());
      const spanContext = span?.spanContext();

      return {
        service,
        trace_id: spanContext?.traceId,
        span_id: spanContext?.spanId,
      };
    },
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
  });
};

// Usage
const logger = createLogger('deployment-service');

logger.info({
  tenant_id: tenantId,
  deployment_id: deploymentId,
  duration_ms: duration,
}, 'Deployment created successfully');
```

### SLO Definitions

```yaml
# slo-config.yaml
slos:
  - name: api-availability
    description: "API availability SLO"
    target: 0.999  # 99.9%
    window: 30d
    indicator:
      type: availability
      metric: |
        sum(rate(http_requests_total{status!~"5.."}[5m])) /
        sum(rate(http_requests_total[5m]))

  - name: api-latency
    description: "API latency SLO (p99 < 200ms)"
    target: 0.99
    window: 30d
    indicator:
      type: latency
      metric: |
        histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) < 0.2

  - name: deployment-success-rate
    description: "Deployment success rate SLO"
    target: 0.995  # 99.5%
    window: 7d
    indicator:
      type: quality
      metric: |
        sum(deployments_total{status="success"}) /
        sum(deployments_total)

alerting:
  error_budget_burn_rate:
    - severity: warning
      threshold: 2  # 2x burn rate
      window: 1h
    - severity: critical
      threshold: 10  # 10x burn rate
      window: 5m
```

### Grafana Dashboard as Code

```json
{
  "dashboard": {
    "title": "Catalyst Platform Overview",
    "tags": ["catalyst", "overview"],
    "panels": [
      {
        "title": "API Requests per Second",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (method)",
            "legendFormat": "{{method}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error %"
          }
        ]
      },
      {
        "title": "P99 Latency",
        "type": "gauge",
        "gridPos": { "x": 0, "y": 8, "w": 6, "h": 6 },
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
          }
        ],
        "options": {
          "thresholds": {
            "steps": [
              { "value": 0, "color": "green" },
              { "value": 0.2, "color": "yellow" },
              { "value": 0.5, "color": "red" }
            ]
          }
        }
      },
      {
        "title": "SLO Error Budget Remaining",
        "type": "stat",
        "gridPos": { "x": 6, "y": 8, "w": 6, "h": 6 },
        "targets": [
          {
            "expr": "(1 - (sum(increase(http_requests_total{status=~\"5..\"}[30d])) / sum(increase(http_requests_total[30d])))) / 0.001 * 100"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

```yaml
# alertmanager-rules.yaml
groups:
  - name: catalyst-api
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 1%)"
          runbook_url: "https://runbooks.catalyst.deltek.com/high-error-rate"

      - alert: HighLatency
        expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "P99 latency is {{ $value | humanizeDuration }}"

      - alert: DeploymentFailures
        expr: sum(rate(deployments_total{status="failed"}[1h])) > 0.1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Elevated deployment failures"
          description: "{{ $value }} deployment failures per minute"

      - alert: AgentExecutionFailure
        expr: sum(rate(agent_executions_total{status="failed"}[1h])) by (agent_id) > 0.05
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Agent {{ $labels.agent_id }} has elevated failures"
```

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [SLO Engineering](https://sre.google/workbook/implementing-slos/)
- [Distributed Tracing](https://opentracing.io/docs/overview/)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
