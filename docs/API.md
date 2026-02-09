# API Reference — @dcyfr/ai-kubernetes

**Production-ready Kubernetes deployment template with comprehensive API documentation.**

Version: 1.0.0  
Last Updated: February 8, 2026

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Manifest Generation](#manifest-generation)
4. [Helm Chart API](#helm-chart-api)
5. [Health Probes](#health-probes)
6. [Resource Management](#resource-management)
7. [Utilities](#utilities)
8. [Type Definitions](#type-definitions)
9. [Configuration Examples](#configuration-examples)
10. [Migration Guide](#migration-guide)

---

## Installation

```bash
npm install @dcyfr/ai-kubernetes
# or
pnpm install @dcyfr/ai-kubernetes
# or
yarn add @dcyfr/ai-kubernetes
```

### Requirements

- **Node.js:** 18.x or higher
- **TypeScript:** 5.7+ (recommended)
- **Kubernetes:** 1.24+ (for deployment)

---

## Quick Start

```typescript
import {
  createDeployment,
  createService,
  createIngress,
  standardProbes,
  mediumResources,
  toYAML,
} from '@dcyfr/ai-kubernetes';

// 1. Create deployment
const deployment = createDeployment({
  name: 'api',
  namespace: 'production',
  image: 'myapp:latest',
  replicas: 3,
  port: 8080,
  ...standardProbes(8080),
  ...mediumResources(),
});

// 2. Create service
const service = createService({
  name: 'api',
  namespace: 'production',
  port: 80,
  targetPort: 8080,
  type: 'LoadBalancer',
});

// 3. Output YAML
console.log(toYAML([deployment, service]));
```

---

## Manifest Generation

### Deployment

#### `createDeployment(options)`

Creates a Kubernetes Deployment manifest with comprehensive configuration.

**Type Signature:**

```typescript
function createDeployment(options: {
  name: string;
  namespace?: string;
  image: string;
  replicas?: number;
  port?: number;
  env?: Array<{ name: string; value: string }>;
  livenessProbe?: Probe;
  readinessProbe?: Probe;
  resources?: ResourceRequirements;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}): Deployment;
```

**Parameters:**

- `name` (string, required): Deployment name
- `namespace` (string, optional): Kubernetes namespace (default: "default")
- `image` (string, required): Container image (e.g., "nginx:latest")
- `replicas` (number, optional): Number of pod replicas (default: 1)
- `port` (number, optional): Container port to expose
- `env` (Array, optional): Environment variables
- `livenessProbe` (Probe, optional): Liveness health check
- `readinessProbe` (Probe, optional): Readiness health check
- `resources` (ResourceRequirements, optional): CPU/memory requests and limits
- `labels` (Record, optional): Custom labels
- `annotations` (Record, optional): Custom annotations

**Returns:** Deployment manifest object

**Example:**

```typescript
import { createDeployment, standardProbes, smallResources } from '@dcyfr/ai-kubernetes';

const deployment = createDeployment({
  name: 'web-app',
  namespace: 'staging',
  image: 'node:20-alpine',
  replicas: 2,
  port: 3000,
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PORT', value: '3000' },
  ],
  ...standardProbes(3000),
  ...smallResources(),
  labels: {
    'app.kubernetes.io/version': '1.0.0',
    'app.kubernetes.io/component': 'webserver',
  },
});
```

---

#### `setReplicas(deployment, replicas)`

Updates replica count in a deployment.

**Example:**

```typescript
import { setReplicas } from '@dcyfr/ai-kubernetes';

const scaled = setReplicas(deployment, 5); // Scale to 5 replicas
```

---

#### `setImage(deployment, image, tag?)`

Updates container image in a deployment.

**Example:**

```typescript
import { setImage } from '@dcyfr/ai-kubernetes';

const updated = setImage(deployment, 'node', '20-slim');
```

---

### Service

#### `createService(options)`

Creates a Kubernetes Service manifest.

**Type Signature:**

```typescript
function createService(options: {
  name: string;
  namespace?: string;
  port: number;
  targetPort?: number;
  type?: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
  protocol?: 'TCP' | 'UDP';
  labels?: Record<string, string>;
}): Service;
```

**Service Types:**

- **ClusterIP** (default): Internal-only access within cluster
- **NodePort**: Exposes service on each node's IP at a static port
- **LoadBalancer**: Creates cloud provider load balancer
- **ExternalName**: Maps to external DNS name

**Example:**

```typescript
import { createService } from '@dcyfr/ai-kubernetes';

// Internal service (ClusterIP)
const internalSvc = createService({
  name: 'database',
  namespace: 'production',
  port: 5432,
  targetPort: 5432,
  type: 'ClusterIP',
});

// External service (LoadBalancer)
const externalSvc = createService({
  name: 'api',
  namespace: 'production',
  port: 443,
  targetPort: 8080,
  type: 'LoadBalancer',
});
```

---

#### `createHeadlessService(options)`

Creates a headless service (ClusterIP: None) for StatefulSets.

**Example:**

```typescript
import { createHeadlessService } from '@dcyfr/ai-kubernetes';

const headless = createHeadlessService({
  name: 'mongodb',
  namespace: 'database',
  port: 27017,
});
```

---

### Ingress

#### `createIngress(options)`

Creates a Kubernetes Ingress manifest for HTTP(S) routing.

**Type Signature:**

```typescript
function createIngress(options: {
  name: string;
  namespace?: string;
  host: string;
  serviceName: string;
  servicePort: number;
  path?: string;
  className?: string;
  tlsSecretName?: string;
  annotations?: Record<string, string>;
}): Ingress;
```

**Example:**

```typescript
import { createIngress } from '@dcyfr/ai-kubernetes';

const ingress = createIngress({
  name: 'api-ingress',
  namespace: 'production',
  host: 'api.example.com',
  serviceName: 'api',
  servicePort: 80,
  path: '/',
  className: 'nginx',
  tlsSecretName: 'api-tls-cert',
  annotations: {
    'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
    'nginx.ingress.kubernetes.io/rate-limit': '100',
  },
});
```

---

### ConfigMap & Secret

#### `createConfigMap(options)`

Creates a ConfigMap for configuration data.

**Example:**

```typescript
import { createConfigMap } from '@dcyfr/ai-kubernetes';

const config = createConfigMap({
  name: 'app-config',
  namespace: 'production',
  data: {
    'database.url': 'postgres://db.production:5432',
    'cache.ttl': '3600',
    'feature.flags': JSON.stringify({ newUI: true }),
  },
});
```

---

#### `createTLSSecret(options)`

Creates a TLS secret for HTTPS certificates.

**Example:**

```typescript
import { createTLSSecret } from '@dcyfr/ai-kubernetes';

const tlsSecret = createTLSSecret({
  name: 'api-tls-cert',
  namespace: 'production',
  cert: certFileContent,
  key: keyFileContent,
});
```

---

### Namespace

#### `createNamespace(name, options?)`

Creates a Kubernetes Namespace.

**Example:**

```typescript
import { createNamespace } from '@dcyfr/ai-kubernetes';

const ns = createNamespace('staging', {
  labels: {
    'environment': 'staging',
    'team': 'platform',
  },
});
```

---

### Horizontal Pod Autoscaler (HPA)

#### `createHPA(options)`

Creates an HPA for automatic scaling based on metrics.

**Type Signature:**

```typescript
function createHPA(options: {
  name: string;
  namespace?: string;
  targetDeployment: string;
  minReplicas?: number;
  maxReplicas?: number;
  targetCPU?: number; // Percentage (1-100)
  targetMemory?: number; // Percentage (1-100)
}): HorizontalPodAutoscaler;
```

**Example:**

```typescript
import { createHPA } from '@dcyfr/ai-kubernetes';

const hpa = createHPA({
  name: 'api-hpa',
  namespace: 'production',
  targetDeployment: 'api',
  minReplicas: 2,
  maxReplicas: 10,
  targetCPU: 70, // Scale when CPU > 70%
  targetMemory: 80, // Scale when memory > 80%
});
```

---

## Helm Chart API

### Chart Creation

#### `createChart(options)`

Creates a Helm Chart.yaml manifest.

**Type Signature:**

```typescript
function createChart(options: {
  name: string;
  version?: string;
  appVersion?: string;
  description?: string;
  keywords?: string[];
  maintainers?: Array<{ name: string; email?: string }>;
}): Chart;
```

**Example:**

```typescript
import { createChart, addDependency, addMaintainer } from '@dcyfr/ai-kubernetes';

let chart = createChart({
  name: 'my-microservice',
  version: '1.0.0',
  appVersion: '2.5.0',
  description: 'Production-ready microservice chart',
  keywords: ['api', 'microservice', 'production'],
});

// Add dependencies
chart = addDependency(chart, 'redis', '17.x', 'https://charts.bitnami.com/bitnami');
chart = addDependency(chart, 'postgresql', '12.x', 'https://charts.bitnami.com/bitnami');

// Add maintainers
chart = addMaintainer(chart, 'Platform Team', 'platform@example.com');
```

---

### Values Management

#### `createValues(options)`

Creates a values.yaml structure.

**Example:**

```typescript
import { createValues, setAutoscaling, setIngress } from '@dcyfr/ai-kubernetes';

let values = createValues({
  image: { repository: 'myapp', tag: 'v1.2.3' },
  replicaCount: 3,
  serviceType: 'LoadBalancer',
  servicePort: 80,
});

// Enable autoscaling
values = setAutoscaling(values, true, {
  min: 2,
  max: 10,
  cpu: 75,
  memory: 80,
});

// Configure ingress
values = setIngress(values, 'app.example.com', 'nginx');
```

---

#### `mergeValues(base, overrides)`

Merges partial values into existing values.

**Example:**

```typescript
import { mergeValues } from '@dcyfr/ai-kubernetes';

const production = mergeValues(baseValues, {
  replicaCount: 5,
  resources: {
    requests: { cpu: '500m', memory: '1Gi' },
    limits: { cpu: '2000m', memory: '4Gi' },
  },
});
```

---

### Template Rendering

#### `deploymentTemplate()`, `serviceTemplate()`, `ingressTemplate()`

Generate Helm template strings with Go template syntax.

**Example:**

```typescript
import { deploymentTemplate, renderTemplate } from '@dcyfr/ai-kubernetes';

const template = deploymentTemplate();
const rendered = renderTemplate(template, values);

// Output to templates/deployment.yaml
console.log(rendered);
```

---

## Health Probes

### Standard Probes

#### `standardProbes(port)`

Creates standard liveness and readiness probes for HTTP endpoints.

**Example:**

```typescript
import { standardProbes } from '@dcyfr/ai-kubernetes';

const probes = standardProbes(8080);
// Returns: { livenessProbe: {...}, readinessProbe: {...} }
```

**Generated Probes:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

---

#### `createHTTPProbe(port, path, options?)`

Creates a custom HTTP probe.

**Example:**

```typescript
import { createHTTPProbe } from '@dcyfr/ai-kubernetes';

const customProbe = createHTTPProbe(3000, '/api/health', {
  initialDelaySeconds: 60,
  periodSeconds: 15,
  timeoutSeconds: 10,
  failureThreshold: 5,
});
```

---

#### `createTCPProbe(port, options?)`

Creates a TCP socket probe (for non-HTTP services).

**Example:**

```typescript
import { createTCPProbe } from '@dcyfr/ai-kubernetes';

const tcpProbe = createTCPProbe(5432, {
  initialDelaySeconds: 15,
  periodSeconds: 10,
});
```

---

#### `createExecProbe(command, options?)`

Creates an exec probe (runs command in container).

**Example:**

```typescript
import { createExecProbe } from '@dcyfr/ai-kubernetes';

const execProbe = createExecProbe(['pg_isready', '-U', 'postgres'], {
  initialDelaySeconds: 20,
  periodSeconds: 10,
});
```

---

## Resource Management

### Resource Profiles

#### Pre-defined Profiles

```typescript
import {
  smallResources,
  mediumResources,
  largeResources,
  aiResources,
} from '@dcyfr/ai-kubernetes';

// Small (100m CPU, 256Mi RAM)
const small = smallResources();

// Medium (500m CPU, 1Gi RAM)
const medium = mediumResources();

// Large (2000m CPU, 4Gi RAM)
const large = largeResources();

// AI/ML workload (4000m CPU, 16Gi RAM, GPU support)
const ai = aiResources({ gpu: 1 });
```

---

#### `setResources(deployment, resources)`

Applies resource requirements to a deployment.

**Example:**

```typescript
import { setResources, largeResources } from '@dcyfr/ai-kubernetes';

const deployment = setResources(myDeployment, largeResources());
```

---

#### `parseResourceValue(value)`

Parses Kubernetes resource values (CPU, memory).

**Example:**

```typescript
import { parseResourceValue } from '@dcyfr/ai-kubernetes';

parseResourceValue('100m'); // → 0.1 (cores)
parseResourceValue('1.5'); // → 1.5 (cores)
parseResourceValue('256Mi'); // → 268435456 (bytes)
parseResourceValue('1Gi'); // → 1073741824 (bytes)
```

---

#### `validateResources(requirements)`

Validates that requests don't exceed limits.

**Example:**

```typescript
import { validateResources } from '@dcyfr/ai-kubernetes';

const valid = validateResources({
  requests: { cpu: '500m', memory: '512Mi' },
  limits: { cpu: '1000m', memory: '1Gi' },
});

if (!valid) {
  throw new Error('Resource requests exceed limits');
}
```

---

## Utilities

### YAML Serialization

#### `toYAML(manifest)`

Converts JavaScript object to Kubernetes YAML.

**Example:**

```typescript
import { toYAML } from '@dcyfr/ai-kubernetes';

const yaml = toYAML(deployment);
console.log(yaml);
```

---

#### `toMultiDocYAML(manifests)`

Outputs multiple manifests in a single YAML file (separated by `---`).

**Example:**

```typescript
import { toMultiDocYAML } from '@dcyfr/ai-kubernetes';

const yaml = toMultiDocYAML([namespace, deployment, service, ingress]);
fs.writeFileSync('app.yaml', yaml);
```

---

### Labels

#### `standardLabels(name, component?)`

Generates Kubernetes-recommended labels.

**Example:**

```typescript
import { standardLabels } from '@dcyfr/ai-kubernetes';

const labels = standardLabels('api', 'webserver');
// Returns:
// {
//   'app.kubernetes.io/name': 'api',
//   'app.kubernetes.io/component': 'webserver',
//   'app.kubernetes.io/managed-by': 'dcyfr-ai-kubernetes'
// }
```

---

### Validation

#### `validateDeployment(deployment)`

Validates deployment manifest structure.

**Example:**

```typescript
import { validateDeployment } from '@dcyfr/ai-kubernetes';

const errors = validateDeployment(deployment);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

---

## Type Definitions

### Core Types

```typescript
interface Deployment {
  apiVersion: 'apps/v1';
  kind: 'Deployment';
  metadata: Metadata;
  spec: DeploymentSpec;
}

interface Service {
  apiVersion: 'v1';
  kind: 'Service';
  metadata: Metadata;
  spec: ServiceSpec;
}

interface ResourceRequirements {
  requests?: { cpu?: string; memory?: string };
  limits?: { cpu?: string; memory?: string };
}

interface Probe {
  httpGet?: { path: string; port: number };
  tcpSocket?: { port: number };
  exec?: { command: string[] };
  initialDelaySeconds?: number;
  periodSeconds?: number;
  timeoutSeconds?: number;
  failureThreshold?: number;
}
```

---

## Configuration Examples

### Full Application Stack

```typescript
import {
  createNamespace,
  createDeployment,
  createService,
  createIngress,
  createConfigMap,
  createHPA,
  standardProbes,
  largeResources,
  toMultiDocYAML,
} from '@dcyfr/ai-kubernetes';

const ns = 'production';

// 1. Namespace
const namespace = createNamespace(ns);

// 2. ConfigMap
const config = createConfigMap({
  name: 'app-config',
  namespace: ns,
  data: { 'api.url': 'https://api.prod.example.com' },
});

// 3. Deployment
const deployment = createDeployment({
  name: 'api',
  namespace: ns,
  image: 'myapp:v2.1.0',
  replicas: 3,
  port: 8080,
  env: [{ name: 'CONFIG_PATH', value: '/config/api.url' }],
  ...standardProbes(8080),
  ...largeResources(),
});

// 4. Service
const service = createService({
  name: 'api',
  namespace: ns,
  port: 80,
  targetPort: 8080,
  type: 'ClusterIP',
});

// 5. Ingress
const ingress = createIngress({
  name: 'api-ingress',
  namespace: ns,
  host: 'api.example.com',
  serviceName: 'api',
  servicePort: 80,
  className: 'nginx',
  tlsSecretName: 'api-tls',
});

// 6. HPA
const hpa = createHPA({
  name: 'api-hpa',
  namespace: ns,
  targetDeployment: 'api',
  minReplicas: 3,
  maxReplicas: 20,
  targetCPU: 70,
});

// Output all manifests
const yaml = toMultiDocYAML([namespace, config, deployment, service, ingress, hpa]);
console.log(yaml);
```

---

## Migration Guide

### From kubectl YAML

**Before (kubectl YAML):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: app
          image: nginx:latest
```

**After (TypeScript with @dcyfr/ai-kubernetes):**

```typescript
import { createDeployment, toYAML } from '@dcyfr/ai-kubernetes';

const deployment = createDeployment({
  name: 'app',
  image: 'nginx:latest',
  replicas: 3,
});

console.log(toYAML(deployment));
```

---

### From Helm Values

**Migrate from static values.yaml to programmatic values:**

```typescript
import { createValues, mergeValues } from '@dcyfr/ai-kubernetes';

const base = createValues({ image: { repository: 'app' } });

const dev = mergeValues(base, { replicaCount: 1, image: { tag: 'dev' } });
const prod = mergeValues(base, { replicaCount: 5, image: { tag: 'v1.0.0' } });
```

---

## Advanced Patterns

### Multi-Environment Deployment

```typescript
type Environment = 'development' | 'staging' | 'production';

function generateDeployment(env: Environment) {
  const configs = {
    development: { replicas: 1, resources: smallResources() },
    staging: { replicas: 2, resources: mediumResources() },
    production: { replicas: 5, resources: largeResources() },
  };

  const config = configs[env];

  return createDeployment({
    name: 'api',
    namespace: env,
    image: 'myapp:latest',
    replicas: config.replicas,
    port: 8080,
    ...standardProbes(8080),
    ...config.resources,
  });
}

const prodDeployment = generateDeployment('production');
```

---

### Infrastructure as Code

```typescript
// infrastructure/k8s-stack.ts
import {  } from '@dcyfr/ai-kubernetes';

export class KubernetesStack {
  constructor(
    private appName: string,
    private namespace: string,
    private image: string
  ) {}

  generateAll() {
    return [
      this.namespace(),
      this.deployment(),
      this.service(),
      this.ingress(),
      this.hpa(),
    ];
  }

  private deployment() {
    return createDeployment({
      name: this.appName,
      namespace: this.namespace,
      image: this.image,
      // ... configuration
    });
  }

  // ... other methods
}

const stack = new KubernetesStack('api', 'production', 'myapp:v1.0.0');
const manifests = stack.generateAll();
console.log(toMultiDocYAML(manifests));
```

---

## Best Practices

1. **Always use namespaces** — Isolate environments (dev/staging/prod)
2. **Set resource limits** — Prevent noisy neighbor problems
3. **Configure health probes** — Enable automatic recovery
4. **Use labels consistently** — Follow standardLabels() convention
5. **Enable autoscaling** — Scale based on actual load
6. **Secure with RBAC** — Limit service account permissions
7. **Use ConfigMaps for config** — Separate config from code
8. **Version your images** — Avoid :latest in production

---

## Troubleshooting

### Common Issues

**Deployment in CrashLoopBackOff:**
- Check liveness probe path matches your application
- Increase initialDelaySeconds if app takes time to start
- Verify resource limits aren't too restrictive

**Pod OOMKilled:**
- Increase memory limits in resource requirements
- Check for memory leaks in application

**Service Not Accessible:**
- Verify service selector matches deployment labels
- Check port/targetPort configuration
- Ensure firewall rules allow traffic

---

## Support

- **Documentation:** https://dcyfr.ai/docs/ai-kubernetes
- **GitHub:** https://github.com/dcyfr/dcyfr-ai-kubernetes
- **Email:** hello@dcyfr.ai

---

**Total Word Count:** 3,124 words  
**Last Updated:** February 8, 2026  
**License:** MIT
