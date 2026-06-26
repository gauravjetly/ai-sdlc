"""
AI-SDLC NoOps Self-Healing Engine
===================================
The autonomous operations layer that ensures every system heals itself.

Components:
  1. HealthMonitor       — Continuously polls service health endpoints
  2. AnomalyDetector     — Statistical anomaly detection (3-sigma rule)
  3. RemediationEngine   — Executes autonomous fix playbooks
  4. CircuitBreaker      — Prevents cascade failures
  5. ResilienceGenerator — Generates self-healing code patterns for any service
  6. ChaosProbe          — Validates resilience by injecting controlled failures
"""
from __future__ import annotations

import asyncio
import json
import math
import os
import statistics
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

import structlog

log = structlog.get_logger(__name__)


# ── Circuit Breaker ───────────────────────────────────────────────────────────

class CircuitState(str, Enum):
    CLOSED    = "closed"     # Normal operation
    OPEN      = "open"       # Failing — reject calls immediately
    HALF_OPEN = "half_open"  # Testing — allow one probe call


class CircuitBreaker:
    """
    Production-grade circuit breaker with configurable thresholds.
    Thread-safe. Emits structured log events on state transitions.
    """

    def __init__(
        self,
        name:              str,
        failure_threshold: int   = 5,
        success_threshold: int   = 2,
        timeout_seconds:   float = 30.0,
        fallback:          Optional[Callable] = None,
    ):
        self.name              = name
        self._failure_threshold = failure_threshold
        self._success_threshold = success_threshold
        self._timeout           = timeout_seconds
        self._fallback          = fallback
        self._state             = CircuitState.CLOSED
        self._failure_count     = 0
        self._success_count     = 0
        self._last_failure_time: Optional[float] = None
        self._lock              = threading.Lock()

    def call(self, func: Callable, *args, **kwargs) -> Any:
        with self._lock:
            if self._state == CircuitState.OPEN:
                if time.time() - (self._last_failure_time or 0) > self._timeout:
                    self._state = CircuitState.HALF_OPEN
                    log.info("circuit.half_open", name=self.name)
                else:
                    if self._fallback:
                        return self._fallback(*args, **kwargs)
                    raise RuntimeError(f"Circuit OPEN for {self.name}")

        try:
            result = func(*args, **kwargs)
            with self._lock:
                if self._state == CircuitState.HALF_OPEN:
                    self._success_count += 1
                    if self._success_count >= self._success_threshold:
                        self._state         = CircuitState.CLOSED
                        self._failure_count = 0
                        self._success_count = 0
                        log.info("circuit.closed", name=self.name)
                else:
                    self._failure_count = 0
            return result
        except Exception as exc:
            with self._lock:
                self._failure_count    += 1
                self._last_failure_time = time.time()
                self._success_count     = 0
                if self._failure_count >= self._failure_threshold:
                    self._state = CircuitState.OPEN
                    log.error("circuit.opened", name=self.name, failures=self._failure_count)
            raise

    @property
    def state(self) -> CircuitState:
        return self._state

    def reset(self) -> None:
        with self._lock:
            self._state         = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
        log.info("circuit.reset", name=self.name)

    def status(self) -> Dict[str, Any]:
        return {"name": self.name, "state": self._state.value,
                "failures": self._failure_count, "successes": self._success_count}


# ── Health Monitor ────────────────────────────────────────────────────────────

@dataclass
class ServiceHealth:
    service:     str
    url:         str
    status:      str          = "unknown"
    latency_ms:  float        = 0.0
    last_check:  str          = ""
    consecutive_failures: int = 0
    history:     List[float]  = field(default_factory=list)  # latency history


class HealthMonitor:
    """
    Continuously monitors service health endpoints.
    Detects anomalies and triggers remediation.
    """

    def __init__(
        self,
        services:         Dict[str, str],   # {service_name: health_url}
        check_interval:   int               = 30,
        on_unhealthy:     Optional[Callable] = None,
        on_anomaly:       Optional[Callable] = None,
    ):
        self._services      = {name: ServiceHealth(service=name, url=url)
                               for name, url in services.items()}
        self._interval      = check_interval
        self._on_unhealthy  = on_unhealthy
        self._on_anomaly    = on_anomaly
        self._running       = False
        self._thread: Optional[threading.Thread] = None
        self._anomaly       = AnomalyDetector()

    def start(self) -> None:
        self._running = True
        self._thread  = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        log.info("health_monitor.started", services=list(self._services.keys()))

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _loop(self) -> None:
        while self._running:
            for name, svc in self._services.items():
                self._check(svc)
            time.sleep(self._interval)

    def _check(self, svc: ServiceHealth) -> None:
        import urllib.request
        t0 = time.time()
        try:
            with urllib.request.urlopen(svc.url, timeout=5) as resp:
                data = json.loads(resp.read())
                svc.status  = data.get("status", "ok")
                svc.latency_ms = (time.time() - t0) * 1000
                svc.consecutive_failures = 0
                svc.last_check = datetime.now(timezone.utc).isoformat()
                svc.history.append(svc.latency_ms)
                if len(svc.history) > 100:
                    svc.history = svc.history[-100:]
                # Anomaly detection on latency
                if len(svc.history) >= 10:
                    is_anomaly, score = self._anomaly.detect(svc.latency_ms, svc.history[:-1])
                    if is_anomaly and self._on_anomaly:
                        self._on_anomaly(svc.service, "latency_spike",
                            {"latency_ms": svc.latency_ms, "z_score": score})
        except Exception as exc:
            svc.status = "unhealthy"
            svc.consecutive_failures += 1
            svc.last_check = datetime.now(timezone.utc).isoformat()
            log.warning("health.unhealthy", service=svc.service, error=str(exc),
                        consecutive=svc.consecutive_failures)
            if self._on_unhealthy:
                self._on_unhealthy(svc.service, svc.consecutive_failures, str(exc))

    def all_status(self) -> Dict[str, Any]:
        return {name: {"status": s.status, "latency_ms": s.latency_ms,
                       "failures": s.consecutive_failures, "last_check": s.last_check}
                for name, s in self._services.items()}


# ── Anomaly Detector ──────────────────────────────────────────────────────────

class AnomalyDetector:
    """
    Statistical anomaly detection using the 3-sigma rule.
    Returns (is_anomaly, z_score) for any metric value.
    """

    def detect(self, value: float, history: List[float],
               threshold: float = 3.0) -> Tuple[bool, float]:
        if len(history) < 5:
            return False, 0.0
        try:
            mean   = statistics.mean(history)
            stdev  = statistics.stdev(history)
            if stdev == 0:
                return False, 0.0
            z_score = abs(value - mean) / stdev
            return z_score > threshold, round(z_score, 2)
        except Exception:
            return False, 0.0


# ── Remediation Engine ────────────────────────────────────────────────────────

@dataclass
class RemediationAction:
    name:        str
    description: str
    command:     Optional[str]        = None
    func:        Optional[Callable]   = None
    dry_run:     bool                 = False

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        log.info("remediation.executing", action=self.name, dry_run=self.dry_run)
        if self.dry_run:
            return {"status": "dry_run", "action": self.name}
        if self.func:
            return self.func(context)
        if self.command:
            cmd = self.command.format(**context)
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
            return {"returncode": result.returncode, "stdout": result.stdout, "stderr": result.stderr}
        return {"status": "no_op"}


class RemediationEngine:
    """
    Autonomous remediation engine that executes fix playbooks.
    All actions are logged to the audit trail.
    """

    def __init__(self, dry_run: bool = False):
        self._dry_run = dry_run
        self._audit:  List[Dict] = []
        self._playbooks: Dict[str, List[RemediationAction]] = {}
        self._register_default_playbooks()

    def _register_default_playbooks(self) -> None:
        """Register built-in NoOps remediation playbooks."""

        # High CPU playbook
        self._playbooks["high_cpu"] = [
            RemediationAction("scale_up",
                "Scale up the deployment by 2 replicas",
                command="kubectl scale deployment/{service} --replicas=+2 -n {namespace}"),
            RemediationAction("enable_rate_limit",
                "Enable rate limiting on the ingress",
                command="kubectl annotate ingress/{service} nginx.ingress.kubernetes.io/limit-rps=100 -n {namespace}"),
        ]

        # Memory leak playbook
        self._playbooks["memory_leak"] = [
            RemediationAction("rolling_restart",
                "Perform a rolling restart of the deployment",
                command="kubectl rollout restart deployment/{service} -n {namespace}"),
            RemediationAction("capture_heap_dump",
                "Capture heap dump for analysis",
                command="kubectl exec -n {namespace} $(kubectl get pod -l app={service} -n {namespace} -o name | head -1) -- jcmd 1 VM.heap_dump /tmp/heap.hprof"),
        ]

        # Service unavailable playbook
        self._playbooks["service_unavailable"] = [
            RemediationAction("check_pod_status",
                "Check pod status and events",
                command="kubectl describe pods -l app={service} -n {namespace}"),
            RemediationAction("rolling_restart",
                "Rolling restart",
                command="kubectl rollout restart deployment/{service} -n {namespace}"),
            RemediationAction("rollback",
                "Rollback to previous version",
                command="kubectl rollout undo deployment/{service} -n {namespace}"),
        ]

        # Database connection exhaustion
        self._playbooks["db_connection_exhaustion"] = [
            RemediationAction("restart_connection_pool",
                "Restart PgBouncer connection pool",
                command="kubectl rollout restart deployment/pgbouncer -n {namespace}"),
            RemediationAction("kill_idle_connections",
                "Kill idle database connections",
                command="kubectl exec -n {namespace} $(kubectl get pod -l app=postgres -o name | head -1) -- psql -U postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';\""),
        ]

        # Disk full playbook
        self._playbooks["disk_full"] = [
            RemediationAction("rotate_logs",
                "Rotate and compress old logs",
                command="kubectl exec -n {namespace} $(kubectl get pod -l app={service} -o name | head -1) -- find /var/log -name '*.log' -mtime +1 -exec gzip {{}} \\;"),
            RemediationAction("expand_pvc",
                "Expand PersistentVolumeClaim",
                command="kubectl patch pvc {pvc_name} -n {namespace} -p '{{\"spec\":{{\"resources\":{{\"requests\":{{\"storage\":\"{new_size}\"}}}}}}}}' "),
        ]

    def register_playbook(self, trigger: str, actions: List[RemediationAction]) -> None:
        self._playbooks[trigger] = actions

    def remediate(self, trigger: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the remediation playbook for a given trigger."""
        playbook = self._playbooks.get(trigger)
        if not playbook:
            log.warning("remediation.no_playbook", trigger=trigger)
            return {"status": "no_playbook", "trigger": trigger}

        results = []
        for action in playbook:
            if self._dry_run:
                action.dry_run = True
            try:
                result = action.execute(context)
                results.append({"action": action.name, "result": result, "success": True})
                log.info("remediation.action_success", action=action.name)
            except Exception as e:
                results.append({"action": action.name, "error": str(e), "success": False})
                log.error("remediation.action_failed", action=action.name, error=str(e))

        audit_entry = {
            "id":        str(uuid.uuid4()),
            "trigger":   trigger,
            "context":   context,
            "results":   results,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "dry_run":   self._dry_run,
        }
        self._audit.append(audit_entry)
        return audit_entry

    def audit_log(self) -> List[Dict]:
        return list(self._audit)


# ── Resilience Code Generator ─────────────────────────────────────────────────

class ResilienceCodeGenerator:
    """
    Generates self-healing code patterns for any service in any language.
    These patterns are baked into every service the EngineerAgent produces.
    """

    PYTHON_CIRCUIT_BREAKER = '''
import threading
import time
from enum import Enum
from typing import Any, Callable, Optional


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """Production-grade circuit breaker. Thread-safe."""

    def __init__(self, name: str, failure_threshold: int = 5,
                 success_threshold: int = 2, timeout: float = 30.0,
                 fallback: Optional[Callable] = None):
        self.name = name
        self._failure_threshold = failure_threshold
        self._success_threshold = success_threshold
        self._timeout = timeout
        self._fallback = fallback
        self._state = CircuitState.CLOSED
        self._failures = 0
        self._successes = 0
        self._last_failure: Optional[float] = None
        self._lock = threading.Lock()

    def __call__(self, func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper

    def call(self, func: Callable, *args, **kwargs) -> Any:
        with self._lock:
            if self._state == CircuitState.OPEN:
                if self._last_failure and time.time() - self._last_failure > self._timeout:
                    self._state = CircuitState.HALF_OPEN
                else:
                    if self._fallback:
                        return self._fallback(*args, **kwargs)
                    raise RuntimeError(f"Circuit OPEN: {self.name}")
        try:
            result = func(*args, **kwargs)
            with self._lock:
                if self._state == CircuitState.HALF_OPEN:
                    self._successes += 1
                    if self._successes >= self._success_threshold:
                        self._state = CircuitState.CLOSED
                        self._failures = self._successes = 0
                else:
                    self._failures = 0
            return result
        except Exception:
            with self._lock:
                self._failures += 1
                self._last_failure = time.time()
                if self._failures >= self._failure_threshold:
                    self._state = CircuitState.OPEN
            raise
'''

    PYTHON_HEALTH_ENDPOINTS = '''
from fastapi import FastAPI
from pydantic import BaseModel
import time
import os

app = FastAPI()
_start_time = time.time()
SERVICE_NAME = os.getenv("SERVICE_NAME", "service")
VERSION = os.getenv("VERSION", "0.0.1")


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: float
    checks: dict


@app.get("/health/live", response_model=HealthResponse)
async def liveness():
    """Kubernetes liveness probe — is the process alive?"""
    return HealthResponse(
        status="ok", service=SERVICE_NAME, version=VERSION,
        uptime_seconds=round(time.time() - _start_time, 1),
        checks={}
    )


@app.get("/health/ready", response_model=HealthResponse)
async def readiness():
    """Kubernetes readiness probe — is the service ready to accept traffic?"""
    checks = {}
    overall = "ok"

    # Check database
    try:
        from app.database import engine
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        overall = "degraded"

    # Check cache
    try:
        import redis
        r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
        r.ping()
        checks["cache"] = "ok"
    except Exception as e:
        checks["cache"] = f"error: {e}"

    return HealthResponse(
        status=overall, service=SERVICE_NAME, version=VERSION,
        uptime_seconds=round(time.time() - _start_time, 1),
        checks=checks
    )


@app.get("/health/startup", response_model=HealthResponse)
async def startup():
    """Kubernetes startup probe — has the service finished initializing?"""
    return HealthResponse(
        status="ok", service=SERVICE_NAME, version=VERSION,
        uptime_seconds=round(time.time() - _start_time, 1),
        checks={"initialized": True}
    )
'''

    PYTHON_GRACEFUL_SHUTDOWN = '''
import asyncio
import signal
import logging

logger = logging.getLogger(__name__)
_shutdown_event = asyncio.Event()


def setup_graceful_shutdown(app, cleanup_func=None):
    """Configure graceful shutdown for SIGTERM and SIGINT."""

    def _handle_signal(sig, frame):
        logger.info(f"Received signal {sig}. Starting graceful shutdown...")
        _shutdown_event.set()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Draining in-flight requests (max 30s)...")
        try:
            await asyncio.wait_for(_drain_requests(), timeout=30.0)
        except asyncio.TimeoutError:
            logger.warning("Drain timeout — forcing shutdown")
        if cleanup_func:
            await cleanup_func()
        logger.info("Graceful shutdown complete")

    async def _drain_requests():
        # Wait for in-flight requests to complete
        await asyncio.sleep(2)  # Give load balancer time to stop routing
        # Application-specific drain logic here
'''

    PYTHON_STRUCTURED_LOGGING = '''
import logging
import json
import sys
import os
import time
from typing import Any


class JSONFormatter(logging.Formatter):
    """Structured JSON log formatter with trace context."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp":  self.formatTime(record, "%Y-%m-%dT%H:%M:%S.%fZ"),
            "level":      record.levelname,
            "service":    os.getenv("SERVICE_NAME", "unknown"),
            "version":    os.getenv("VERSION", "0.0.1"),
            "logger":     record.name,
            "message":    record.getMessage(),
            "trace_id":   getattr(record, "trace_id", ""),
            "span_id":    getattr(record, "span_id", ""),
        }
        if record.exc_info:
            log_data["error"] = self.formatException(record.exc_info)
        # Add any extra fields
        for key, value in record.__dict__.items():
            if key not in ("msg", "args", "levelname", "levelno", "pathname",
                           "filename", "module", "exc_info", "exc_text",
                           "stack_info", "lineno", "funcName", "created",
                           "msecs", "relativeCreated", "thread", "threadName",
                           "processName", "process", "name", "message"):
                log_data[key] = value
        return json.dumps(log_data)


def setup_logging(level: str = "INFO") -> logging.Logger:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=getattr(logging, level), handlers=[handler])
    return logging.getLogger(__name__)
'''

    KUBERNETES_DEPLOYMENT_TEMPLATE = '''
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {service_name}
  namespace: {namespace}
  labels:
    app: {service_name}
    version: "{version}"
    managed-by: ai-sdlc
spec:
  replicas: {replicas}
  selector:
    matchLabels:
      app: {service_name}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0       # Zero-downtime deployments
  template:
    metadata:
      labels:
        app: {service_name}
        version: "{version}"
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      terminationGracePeriodSeconds: 60
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: {service_name}
      containers:
        - name: {service_name}
          image: {image}:{version}
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
              name: http
          resources:
            requests:
              cpu: "{cpu_request}"
              memory: "{memory_request}"
            limits:
              cpu: "{cpu_limit}"
              memory: "{memory_limit}"
          env:
            - name: SERVICE_NAME
              value: {service_name}
            - name: VERSION
              value: "{version}"
            - name: LOG_LEVEL
              value: "INFO"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3
            timeoutSeconds: 5
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
            timeoutSeconds: 5
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8080
            failureThreshold: 30
            periodSeconds: 10
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
      securityContext:
        fsGroup: 1000
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {service_name}-pdb
  namespace: {namespace}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: {service_name}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {service_name}-hpa
  namespace: {namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {service_name}
  minReplicas: {min_replicas}
  maxReplicas: {max_replicas}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
'''

    def generate_for_service(self, service_name: str, language: str = "python",
                             namespace: str = "default") -> Dict[str, str]:
        """Generate all self-healing code patterns for a service."""
        files: Dict[str, str] = {}

        if language == "python":
            files["src/resilience/circuit_breaker.py"] = self.PYTHON_CIRCUIT_BREAKER
            files["src/resilience/health.py"]          = self.PYTHON_HEALTH_ENDPOINTS
            files["src/resilience/shutdown.py"]        = self.PYTHON_GRACEFUL_SHUTDOWN
            files["src/resilience/logging.py"]         = self.PYTHON_STRUCTURED_LOGGING
            files["src/resilience/__init__.py"]        = (
                "from .circuit_breaker import CircuitBreaker\n"
                "from .health import app as health_app\n"
                "from .shutdown import setup_graceful_shutdown\n"
                "from .logging import setup_logging\n"
            )

        files["k8s/deployment.yaml"] = self.KUBERNETES_DEPLOYMENT_TEMPLATE.format(
            service_name=service_name, namespace=namespace,
            version="latest", replicas=2, image=f"registry/{service_name}",
            cpu_request="100m", memory_request="128Mi",
            cpu_limit="500m", memory_limit="512Mi",
            min_replicas=2, max_replicas=10,
        )

        return files
