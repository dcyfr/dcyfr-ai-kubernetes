# Kubernetes Monitoring & Observability

**Target Audience:** DevOps engineers, SREs, platform teams  
**Prerequisites:** Running K8s cluster, kubectl access

---

## Overview

Production monitoring requires three pillars:
1. **Metrics** - Time-series data (CPU, memory, request rates)
2. **Logging** - Event streams and application logs
3. **Tracing** - Distributed request tracing

This guide covers complete observability setup for Kubernetes using industry-standard tools.

---

## Metrics with Prometheus + Grafana

### Install Prometheus Stack

```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack (Prometheus + Grafana + Alertmanager)
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set grafana.adminPassword=admin123

# Verify installation
kubectl get pods -n monitoring
```

### Access Grafana Dashboard

```bash
# Port-forward Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80

# Open http://localhost:3000
# Username: admin
# Password: admin123 (or what you set)
```

**Default Dashboards:**
- Kubernetes / Compute Resources / Cluster
- Kubernetes / Compute Resources / Namespace (Pods)
- Kubernetes / Networking / Cluster
- Node Exporter / Nodes

### Application Metrics with Prometheus Client

```typescript
// Install prometheus client
// npm install prom-client

import { register, Counter, Histogram, Gauge } from 'prom-client';
import express from 'express';

const app = express();

// Define custom metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

// Middleware to record metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route: req.path, status: res.statusCode }, duration);
  });
  
  next();
});

// Expose /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(8080);
```

### Configure ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-server-metrics
  namespace: production
  labels:
    release: monitoring
spec:
  selector:
    matchLabels:
      app: api-server
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

Apply ServiceMonitor:
```bash
kubectl apply -f servicemonitor.yaml
```

### Custom Grafana Dashboard

Create dashboard JSON:
```json
{
  "dashboard": {
    "title": "API Server Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Request Duration (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

Import dashboard in Grafana UI: Dashboards → Import → Paste JSON

---

## Logging with ELK Stack

### Install Elasticsearch + Kibana

```bash
# Add Elastic Helm repo
helm repo add elastic https://helm.elastic.co
helm repo update

# Install Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --create-namespace \
  --set replicas=3 \
  --set minimumMasterNodes=2 \
  --set resources.requests.memory=2Gi \
  --set resources.limits.memory=4Gi

# Install Kibana
helm install kibana elastic/kibana \
  --namespace logging \
  --set service.type=LoadBalancer
```

### Install Filebeat (Log Shipper)

```bash
# Install Filebeat as DaemonSet
helm install filebeat elastic/filebeat \
  --namespace logging \
  --set daemonset.enabled=true \
  --set deployment.enabled=false

# Verify
kubectl get pods -n logging
```

### Access Kibana

```bash
# Get Kibana URL
kubectl get svc -n logging kibana-kibana
# Access http://<EXTERNAL-IP>:5601
```

**Configure Index Pattern:**
1. Management → Stack Management → Index Patterns
2. Create index pattern: `filebeat-*`
3. Select timestamp field: `@timestamp`

**View Logs:**
1. Analytics → Discover
2. Filter by namespace: `kubernetes.namespace: production`
3. Search logs: `level: error`

### Structured Logging (Best Practice)

```typescript
import pino from 'pino';

const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Log structured messages
logger.info({ userId: '123', action: 'login' }, 'User logged in');
logger.error({ userId: '123', error: err.message }, 'Login failed');

// Logs output as JSON
// {"level":"info","time":"2026-02-07T12:00:00.000Z","userId":"123","action":"login","msg":"User logged in"}
```

---

## Logging with Loki (Alternative to ELK)

Loki is a lightweight alternative to Elasticsearch, designed by Grafana Labs.

### Install Loki + Promtail

```bash
# Add Grafana Helm repo
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Loki
helm install loki grafana/loki-stack \
  --namespace logging \
  --create-namespace \
  --set grafana.enabled=true \
  --set prometheus.enabled=false \
  --set promtail.enabled=true

# Get Grafana admin password
kubectl get secret -n logging loki-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
```

### Access Loki in Grafana

```bash
# Port-forward Grafana
kubectl port-forward -n logging svc/loki-grafana 3000:80
```

1. Open http://localhost:3000
2. Go to Configuration → Data Sources → Add Loki
3. URL: `http://loki:3100`
4. Save & Test

**Query Logs:**
```logql
{namespace="production", app="api-server"} |= "error"
{namespace="production"} | json | level="error"
```

---

## Distributed Tracing with Jaeger

### Install Jaeger Operator

```bash
# Install Jaeger Operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml -n observability
```

### Deploy Jaeger Instance

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: observability
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
  ingress:
    enabled: true
    hosts:
      - jaeger.example.com
```

Apply:
```bash
kubectl apply -f jaeger.yaml
```

### Instrument Application with OpenTelemetry

```typescript
// npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const jaegerExporter = new JaegerExporter({
  endpoint: 'http://jaeger-production-collector:14268/api/traces',
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'api-server',
});

sdk.start();

// Application code
import express from 'express';
const app = express();

app.get('/api/users/:id', async (req, res) => {
  // Automatically traced!
  const user = await db.users.findOne({ id: req.params.id });
  res.json(user);
});

app.listen(8080);
```

### View Traces in Jaeger UI

```bash
# Port-forward Jaeger UI
kubectl port-forward -n observability svc/jaeger-production-query 16686:16686
```

Open http://localhost:16686

**Trace Analysis:**
1. Select service: `api-server`
2. Find traces: View all requests
3. Click trace: See span details, latency breakdown

---

## Alerting with Alertmanager

### Configure Alerting Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-server-alerts
  namespace: production
  labels:
    release: monitoring
spec:
  groups:
    - name: api_server
      interval: 30s
      rules:
        # High error rate alert
        - alert: HighErrorRate
          expr: |
            rate(http_requests_total{status=~"5.."}[5m]) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate detected"
            description: "{{ $labels.instance }} has error rate {{ $value }}"

        # Pod crash looping
        - alert: PodCrashLooping
          expr: |
            rate(kube_pod_container_status_restarts_total[15m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.pod }} is crash looping"

        # High memory usage
        - alert: HighMemoryUsage
          expr: |
            container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Container {{ $labels.container }} high memory usage"
            description: "Memory usage is {{ $value | humanizePercentage }}"
```

### Configure Alertmanager

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m

    route:
      receiver: 'slack-notifications'
      group_by: ['alertname', 'cluster']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h

    receivers:
      - name: 'slack-notifications'
        slack_configs:
          - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
            channel: '#alerts'
            title: '{{ .GroupLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

      - name: 'pagerduty'
        pagerduty_configs:
          - service_key: 'YOUR_PAGERDUTY_KEY'
```

Apply alerting configuration:
```bash
kubectl apply -f prometheus-rules.yaml
kubectl apply -f alertmanager-config.yaml
```

---

## Monitoring Checklist

- [ ] **Install Prometheus + Grafana** for metrics
- [ ] **Expose /metrics endpoint** in applications
- [ ] **Create ServiceMonitors** for auto-discovery
- [ ] **Build Grafana dashboards** for key metrics
- [ ] **Install logging stack** (ELK or Loki)
- [ ] **Configure structured logging** in applications
- [ ] **Set up Filebeat/Promtail** to ship logs
- [ ] **Install Jaeger** for distributed tracing
- [ ] **Instrument apps** with OpenTelemetry
- [ ] **Configure alerts** in Prometheus
- [ ] **Set up Alertmanager** with Slack/PagerDuty
- [ ] **Test alert routing** with synthetic failures
- [ ] **Document runbooks** for common alerts
- [ ] **Set up dashboards** for business metrics

---

## Key Metrics to Monitor

### Application Metrics
- Request rate (req/s)
- Request duration (p50, p95, p99)
- Error rate (%)
- Active connections
- Queue depth

### Infrastructure Metrics
- CPU usage (%)
- Memory usage (%)
- Disk I/O (MB/s)
- Network I/O (MB/s)
- Pod count

### Business Metrics
- User signups
- Successful transactions
- Revenue (if applicable)
- Active users

---

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P50 Latency | <100ms | >200ms |
| P95 Latency | <500ms | >1000ms |
| P99 Latency | <1000ms | >2000ms |
| Error Rate | <0.1% | >1% |
| CPU Usage | <70% | >90% |
| Memory Usage | <80% | >95% |
| Pod Restarts | 0 | >3 in 15min |

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
