# @dcyfr/ai-kubernetes

**Production-ready Kubernetes deployment template** — Generate, validate, and manage K8s manifests and Helm charts programmatically with TypeScript. Build infrastructure as code with type safety and best practices built-in.

## Features

### Manifest Generation
- **Deployment Builder** — Create deployments with replicas, rolling updates, health probes
- **Service Types** — ClusterIP, NodePort, LoadBalancer, headless services
- **ConfigMap & Secret** — Configuration management with TLS secret helpers
- **Ingress** — HTTP(S) routing with TLS termination, path-based routing
- **Namespace** — Isolated environments with resource quotas
- **HPA (Horizontal Pod Autoscaler)** — CPU, memory, custom metric autoscaling

### Helm Charts
- **Chart Generation** — Chart.yaml, values.yaml, template rendering
- **Dependency Management** — Add chart dependencies, version constraints
- **Template Functions** — Deployment, service, ingress templates

### Health & Resources
- **Health Probes** — HTTP, TCP, exec probes with customizable parameters
- **Resource Profiles** — Predefined small/medium/large/AI resource configurations
- **CPU & Memory Parsing** — Parse Kubernetes resource units (100m, 1Gi)
- **Resource Validation** — Validate requests don't exceed limits

### Utilities
- **YAML Serialization** — Convert JavaScript objects to K8s YAML
- **Multi-Doc YAML** — Output multiple manifests in single file
- **Manifest Validation** — Validate deployments, services, ingresses
- **Standard Labels** — Kubernetes-recommended label helpers

## Quick Start

```bash
# Install dependencies
npm install @dcyfr/ai-kubernetes
```

### Basic Usage

```typescript
import {
  createDeployment,
  createService,
  standardProbes,
  mediumResources,
  setResources,
  toYAML,
} from '@dcyfr/ai-kubernetes';

// Create deployment with health checks and resources
const probes = standardProbes(3000);
let deployment = createDeployment({
  name: 'my-app',
  namespace: 'production',
  image: 'node:20',
  replicas: 3,
  port: 3000,
  livenessProbe: probes.livenessProbe,
  readinessProbe: probes.readinessProbe,
});
deployment = setResources(deployment, mediumResources());

// Create LoadBalancer service
const service = createService({
  name: 'my-app',
  namespace: 'production',
  port: 80,
  targetPort: 3000,
  type: 'LoadBalancer',
});

// Output YAML manifests
console.log(toYAML(deployment));
console.log(toYAML(service));
```

### Deploy to Kubernetes

```bash
# Generate manifests
node generate-manifests.ts > app.yaml

# Validate before applying
kubectl apply --dry-run=client -f app.yaml

# Deploy to cluster
kubectl apply -f app.yaml

# Verify deployment
kubectl get all -n production
kubectl rollout status deployment/my-app -n production
```

## Documentation

Comprehensive guides for production Kubernetes deployments:

- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Cluster setup (GKE, EKS, AKS), zero-downtime deployments, blue-green and canary strategies
- **[docs/MONITORING.md](docs/MONITORING.md)** — Prometheus + Grafana setup, logging with ELK/Loki, distributed tracing with Jaeger
- **[docs/SCALING.md](docs/SCALING.md)** — HPA (CPU/memory/custom metrics), VPA, Cluster Autoscaler configuration
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** — Common pod issues (CrashLoopBackOff, Pending, ImagePullBackOff), networking problems, volume errors
- **[docs/SECURITY.md](docs/SECURITY.md)** — RBAC, Network Policies, PodSecurityStandards, secrets management, image scanning

## Modules

### Manifests (`@dcyfr/ai-kubernetes/manifests`)

```typescript
import {
  createDeployment, setReplicas, addContainer, setResources, setStrategy,
  createService, clusterIPService, nodePortService, loadBalancerService,
  createConfigMap, createSecret, tlsSecret,
  createIngress, addIngressRule, addIngressTLS,
  createNamespace, appNamespace,
  createHPA, setCPUTarget, setMemoryTarget,
} from '@dcyfr/ai-kubernetes/manifests';
```

### Helm (`@dcyfr/ai-kubernetes/helm`)

```typescript
import {
  createChart, addDependency,
  createValues, setAutoscaling, setIngress,
  renderTemplate, deploymentTemplate, serviceTemplate,
} from '@dcyfr/ai-kubernetes/helm';
```

### Health (`@dcyfr/ai-kubernetes/health`)

```typescript
import {
  httpProbe, tcpProbe, execProbe,
  livenessProbe, readinessProbe, startupProbe, standardProbes,
  smallResources, mediumResources, largeResources, aiResources,
  parseCPU, parseMemory, validateResources,
} from '@dcyfr/ai-kubernetes/health';
```

### Utils (`@dcyfr/ai-kubernetes/utils`)

```typescript
import {
  toYAML, toMultiDocYAML,
  validateDeployment, validateService, validateManifest,
  standardLabels, appLabels, isValidLabelKey,
} from '@dcyfr/ai-kubernetes/utils';
```

## Resource Profiles

| Profile | CPU Request | CPU Limit | Memory Request | Memory Limit | Best For |
|---------|-------------|-----------|----------------|--------------|----------|
| **small** | 50m | 200m | 64Mi | 256Mi | Sidecars, simple services |
| **medium** | 250m | 500m | 256Mi | 512Mi | Standard web apps, APIs |
| **large** | 500m | 1000m | 512Mi | 1Gi | High-traffic apps, databases |
| **ai** | 1000m | 4000m | 2Gi | 8Gi | ML models, AI workloads |

```typescript
import { smallResources, mediumResources, largeResources, aiResources, setResources } from '@dcyfr/ai-kubernetes';

// Apply resource profile to deployment
deployment = setResources(deployment, mediumResources());

// Custom resources
deployment = setResources(deployment, {
  requests: { cpu: '100m', memory: '128Mi' },
  limits: { cpu: '500m', memory: '512Mi' },
});
```

## Deployment Patterns

### Production Deployment with HPA

```typescript
import { createDeployment, createService, createHPA, setCPUTarget, toMultiDocYAML } from '@dcyfr/ai-kubernetes';

// Deployment
const deployment = createDeployment({
  name: 'api-server',
  namespace: 'production',
  image: 'myregistry.io/api:v1.0.0',
  replicas: 5,
  port: 8080,
  livenessProbe: httpProbe('/health', 8080, 30, 10),
  readinessProbe: httpProbe('/ready', 8080, 5, 5),
});

// Service
const service = createService({
  name: 'api-server',
  namespace: 'production',
  port: 80,
  targetPort: 8080,
  type: 'ClusterIP',
});

// Horizontal Pod Autoscaler
let hpa = createHPA({
  name: 'api-server-hpa',
  namespace: 'production',
  targetRef: { apiVersion: 'apps/v1', kind: 'Deployment', name: 'api-server' },
  minReplicas: 3,
  maxReplicas: 20,
});
hpa = setCPUTarget(hpa, 70); // Scale at 70% CPU

// Output all manifests
console.log(toMultiDocYAML([deployment, service, hpa]));
```

### Database with Persistent Storage

```typescript
import { createDeployment, createService } from '@dcyfr/ai-kubernetes';

const postgres = createDeployment({
  name: 'postgres',
  namespace: 'production',
  image: 'postgres:16',
  replicas: 1,
  port: 5432,
  env: [
    { name: 'POSTGRES_PASSWORD', valueFrom: { secretKeyRef: { name: 'db-secrets', key: 'password' } } },
  ],
  volumes: [
    {
      name: 'postgres-data',
      persistentVolumeClaim: { claimName: 'postgres-pvc' },
    },
  ],
  volumeMounts: [
    {
      name: 'postgres-data',
      mountPath: '/var/lib/postgresql/data',
    },
  ],
});

const dbService = createService({
  name: 'postgres',
  namespace: 'production',
  port: 5432,
  targetPort: 5432,
  type: 'ClusterIP',
});
```

### Ingress with TLS

```typescript
import { createIngress, addIngressRule, addIngressTLS } from '@dcyfr/ai-kubernetes';

let ingress = createIngress({
  name: 'web-ingress',
  namespace: 'production',
  annotations: {
    'kubernetes.io/ingress.class': 'nginx',
    'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
  },
});

ingress = addIngressRule(ingress, {
  host: 'example.com',
  http: {
    paths: [
      {
        path: '/',
        pathType: 'Prefix',
        backend: {
          service: { name: 'web-app', port: { number: 80 } },
        },
      },
    ],
  },
});

ingress = addIngressTLS(ingress, {
  hosts: ['example.com'],
  secretName: 'example-com-tls',
});

console.log(toYAML(ingress));
```

### ConfigMap for Application Config

```typescript
import { createConfigMap } from '@dcyfr/ai-kubernetes';

const appConfig = createConfigMap({
  name: 'app-config',
  namespace: 'production',
  data: {
    'app.conf': `
server:
  port: 8080
  timeout: 30s
logging:
  level: info
`,
    'database.conf': `
host: postgres.production.svc.cluster.local
port: 5432
pool_size: 20
`,
  },
});
```

### Secrets Management

```typescript
import { createSecret, tlsSecret } from '@dcyfr/ai-kubernetes';

// Generic secret
const dbSecret = createSecret({
  name: 'db-credentials',
  namespace: 'production',
  type: 'Opaque',
  stringData: {
    username: 'admin',
    password: 'super-secret-password',
    url: 'postgresql://admin:password@postgres:5432/mydb',
  },
});

// TLS certificate secret
const tlsCert = tlsSecret({
  name: 'api-tls',
  namespace: 'production',
  cert: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
  key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
});
```

## Helm Chart Generation

```typescript
import { createChart, addDependency, createValues, setAutoscaling, renderTemplate } from '@dcyfr/ai-kubernetes/helm';

// Create Chart.yaml
const chart = createChart({
  name: 'my-app',
  version: '1.0.0',
  appVersion: '1.0.0',
  description: 'My Application Helm Chart',
});

// Add chart dependencies
chart = addDependency(chart, {
  name: 'postgresql',
  version: '12.x.x',
  repository: 'https://charts.bitnami.com/bitnami',
});

// Create values.yaml
let values = createValues({
  replicaCount: 3,
  image: {
    repository: 'myregistry.io/my-app',
    tag: 'v1.0.0',
    pullPolicy: 'IfNotPresent',
  },
  service: {
    type: 'ClusterIP',
    port: 80,
  },
});

// Configure autoscaling
values = setAutoscaling(values, {
  enabled: true,
  minReplicas: 3,
  maxReplicas: 10,
  targetCPUUtilizationPercentage: 70,
});

// Render deployment template
const deploymentTemplate = renderTemplate('deployment', values);
```

## Advanced Features

### Custom Health Probes

```typescript
import { httpProbe, tcpProbe, execProbe } from '@dcyfr/ai-kubernetes/health';

// HTTP probe
const liveness = httpProbe('/health', 8080, 30, 10, 3, 3);

// TCP probe
const readiness = tcpProbe(5432, 5, 5, 3);

// Exec probe
const startup = execProbe(['pg_isready', '-U', 'postgres'], 10, 5, 30);
```

### Custom Resource Parsing

```typescript
import { parseCPU, parseMemory, validateResources } from '@dcyfr/ai-kubernetes/health';

// Parse CPU units
parseCPU('100m');  // 0.1
parseCPU('1.5');   // 1.5
parseCPU('2000m'); // 2

// Parse memory units
parseMemory('128Mi');  // 134217728 bytes
parseMemory('1Gi');    // 1073741824 bytes
parseMemory('512Mi');  // 536870912 bytes

// Validate resources
const isValid = validateResources({
  requests: { cpu: '100m', memory: '128Mi' },
  limits: { cpu: '500m', memory: '512Mi' },
});
```

### Rolling Update Strategy

```typescript
import { createDeployment, setStrategy } from '@dcyfr/ai-kubernetes/manifests';

let deployment = createDeployment({
  name: 'api-server',
  image: 'myapp:v2.0.0',
  replicas: 10,
  port: 8080,
});

deployment = setStrategy(deployment, {
  type: 'RollingUpdate',
  rollingUpdate: {
    maxSurge: '25%',        // Max 25% extra pods during update
    maxUnavailable: '10%',  // Max 10% pods unavailable during update
  },
});
```

## Examples

This template includes comprehensive example deployments:

- **[examples/web-app/](examples/web-app/)** — Full web application with Deployment, Service, Ingress, TLS
- **[examples/helm-chart/](examples/helm-chart/)** — Helm chart generation with values and templates
- **[examples/microservices/](examples/microservices/)** — Multi-service architecture with HPA and network policies

Run examples:
```bash
cd examples/web-app
node generate-manifests.ts
kubectl apply -f manifests.yaml
```

## Platform Deployment Guides

### Google Kubernetes Engine (GKE)

```bash
# Create GKE cluster
gcloud container clusters create production \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials production --region us-central1

# Deploy
kubectl apply -f manifests.yaml
```

### AWS Elastic Kubernetes Service (EKS)

```bash
# Create EKS cluster
eksctl create cluster \
  --name production \
  --region us-east-1 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10

# Deploy
kubectl apply -f manifests.yaml
```

### Azure Kubernetes Service (AKS)

```bash
# Create AKS cluster
az aks create \
  --resource-group myResourceGroup \
  --name production \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group myResourceGroup --name production

# Deploy
kubectl apply -f manifests.yaml
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete platform deployment guides including DigitalOcean, Linode, and local development with kind.

## Monitoring & Observability

### Prometheus Metrics Endpoint

```typescript
const deployment = createDeployment({
  name: 'api-server',
  image: 'myapp:latest',
  replicas: 3,
  port: 8080,
  annotations: {
    'prometheus.io/scrape': 'true',
    'prometheus.io/port': '8080',
    'prometheus.io/path': '/metrics',
  },
});
```

### Liveness & Readiness Probes

```typescript
import { standardProbes } from '@dcyfr/ai-kubernetes';

// Get preconfigured probes for HTTP server
const { livenessProbe, readinessProbe } = standardProbes(8080);

const deployment = createDeployment({
  name: 'api-server',
  image: 'myapp:latest',
  replicas: 3,
  port: 8080,
  livenessProbe,  // Checks if app is alive (restart if fails)
  readinessProbe, // Checks if app is ready for traffic (remove from load balancer if fails)
});
```

See [docs/MONITORING.md](docs/MONITORING.md) for Prometheus +Grafana setup, ELK stack logging, and distributed tracing with Jaeger.

## Security Best Practices

### Non-Root Containers

```typescript
const deployment = createDeployment({
  name: 'secure-app',
  image: 'myapp:latest',
  replicas: 3,
  port: 8080,
  securityContext: {
    runAsNonRoot: true,
    runAsUser: 1000,
    fsGroup: 2000,
  },
  containerSecurityContext: {
    allowPrivilegeEscalation: false,
    readOnlyRootFilesystem: true,
    capabilities: {
      drop: ['ALL'],
    },
  },
});
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-server
      ports:
        - protocol: TCP
          port: 5432
```

See [docs/SECURITY.md](docs/SECURITY.md) for RBAC, PodSecurityStandards, secrets encryption, and image scanning.

## Production Checklist

Before deploying to production:

- [ ] **Resource Requests & Limits** — Set CPU and memory for all containers
- [ ] **Health Probes** — Configure liveness, readiness, and startup probes
- [ ] **Replicas** — Run ≥3 replicas for high availability
- [ ] **HPA** — Configure horizontal pod autoscaling
- [ ] **Pod Disruption Budget** — Ensure minimum availability during updates
- [ ] **Security Context** — Run as non-root, drop capabilities
- [ ] **Network Policies** — Restrict pod-to-pod communication
- [ ] **Secrets** — Use Kubernetes Secrets (encrypted at rest)
- [ ] **TLS** — Enable HTTPS with valid certificates
- [ ] **Monitoring** — Expose `/metrics` endpoint, configure Prometheus
- [ ] **Logging** — Structured logging to stdout (JSON format)
- [ ] **Resource Quotas** — Set namespace-level resource limits
- [ ] **RBAC** — Implement role-based access control
- [ ] **Image Scanning** — Scan for vulnerabilities (Trivy, Clair)
- [ ] **Backup** — Implement etcd backup strategy

## Resource Profiles

| Profile | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| small   | 50m         | 200m      | 64Mi           | 256Mi        |
| medium  | 250m        | 500m      | 256Mi          | 512Mi        |
| large   | 500m        | 1000m     | 512Mi          | 1Gi          |
| ai      | 1000m       | 4000m     | 2Gi            | 8Gi          |

## Development

```bash
# Clone repository
git clone https://github.com/dcyfr/dcyfr-ai-kubernetes.git
cd dcyfr-ai-kubernetes

# Install dependencies
npm install

# Run tests
npm run test:run

# Run tests in watch mode
npm run test:watch

# Type checking
npm run lint

# Build
npm run build

# Coverage report
npm run test:coverage
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE)
