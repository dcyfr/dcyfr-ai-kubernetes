# Kubernetes Deployment Guide

**Target Audience:** DevOps engineers, platform teams, application developers  
**Prerequisites:** K8s cluster access, kubectl CLI, basic K8s knowledge

---

## Overview

This guide covers production Kubernetes deployments using the `@dcyfr/ai-kubernetes` template, from cluster setup to zero-downtime deployments.

---

## Cluster Setup

### Cloud Platform Comparison

| Platform | Setup Time | Cost | Best For |
|----------|-----------|------|----------|
| **Google GKE** | 10 min | $$$ | Enterprise, auto-scaling |
| **AWS EKS** | 20 min | $$$ | AWS ecosystem integration |
| **Azure AKS** | 15 min | $$$ | Microsoft stack integration |
| **DigitalOcean K8s** | 5 min | $$ | Small-medium teams, simple setup |
| **Linode LKE** | 5 min | $ | Budget-friendly, simple |
| **Kind** (local) | 2 min | Free | Development, testing |
| **k3s** | 5 min | Free | Edge, IoT, resource-constrained |

### Google Kubernetes Engine (GKE)

```bash
# Create GKE cluster
gcloud container clusters create production-cluster \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --enable-autorepair \
  --enable-autoupgrade

# Get credentials
gcloud container clusters get-credentials production-cluster --region us-central1

# Verify connection
kubectl cluster-info
```

### AWS Elastic Kubernetes Service (EKS)

```bash
# Install eksctl
brew install eksctl

# Create EKS cluster
eksctl create cluster \
  --name production-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name production-cluster
```

### Local Development (kind)

```bash
# Install kind
brew install kind

# Create local cluster
kind create cluster --name dev-cluster

# Verify
kubectl cluster-info --context kind-dev-cluster
```

---

## Deploying Applications

### Using @dcyfr/ai-kubernetes Builders

```typescript
import { 
  createDeployment, 
  createService,
  createIngress,
  standardProbes,
  largeResources,
  setResources,
  toYAML,
  toMultiDocYAML
} from '@dcyfr/ai-kubernetes';

// 1. Create deployment with health checks and resources
const probes = standardProbes(8080);
let deployment = createDeployment({
  name: 'api-server',
  namespace: 'production',
  image: 'myregistry.io/api-server:v1.2.3',
  replicas: 5,
  port: 8080,
  livenessProbe: probes.livenessProbe,
  readinessProbe: probes.readinessProbe,
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'DATABASE_URL', valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'url' } } },
  ],
});
deployment = setResources(deployment, largeResources());

// 2. Create service
const service = createService({
  name: 'api-server',
  namespace: 'production',
  port: 80,
  targetPort: 8080,
  type: 'ClusterIP',
});

// 3. Create ingress with TLS
const ingress = createIngress({
  name: 'api-server',
  namespace: 'production',
  rules: [
    {
      host: 'api.example.com',
      http: {
        paths: [
          {
            path: '/',
            pathType: 'Prefix',
            backend: {
              service: {
                name: 'api-server',
                port: { number: 80 },
              },
            },
          },
        ],
      },
    },
  ],
  tls: [
    {
      hosts: ['api.example.com'],
      secretName: 'api-tls-cert',
    },
  ],
});

// 4. Output manifests
const manifests = [deployment, service, ingress];
console.log(toMultiDocYAML(manifests));
```

### Apply to Cluster

```bash
# Generate manifests
node generate-manifests.ts > manifests.yaml

# Validate before applying
kubectl apply --dry-run=client -f manifests.yaml

# Apply to cluster
kubectl apply -f manifests.yaml

# Verify deployment
kubectl get all -n production
kubectl rollout status deployment/api-server -n production
```

---

## Namespace Organization

### Environment-Based Namespaces

```typescript
import { createNamespace, appNamespace } from '@dcyfr/ai-kubernetes';

// Create namespaces for different environments
const namespaces = [
  appNamespace('development', 'Development environment'),
  appNamespace('staging', 'Staging environment'),
  appNamespace('production', 'Production environment'),
];

namespaces.forEach(ns => {
  console.log(toYAML(ns));
});
```

### Apply Namespace Strategy

```bash
# Create namespaces
kubectl apply -f namespaces.yaml

# Set default namespace for context
kubectl config set-context --current --namespace=production

# View all namespaces
kubectl get namespaces
```

---

## Zero-Downtime Deployments

### Rolling Update Strategy

```typescript
import { createDeployment, setStrategy } from '@dcyfr/ai-kubernetes';

let deployment = createDeployment({
  name: 'api-server',
  image: 'myregistry.io/api-server:v1.2.4',
  replicas: 10,
  port: 8080,
});

// Configure rolling update
deployment = setStrategy(deployment, {
  type: 'RollingUpdate',
  rollingUpdate: {
    maxSurge: '25%',        // Max pods above desired count
    maxUnavailable: '10%',  // Max pods unavailable during update
  },
});

console.log(toYAML(deployment));
```

**Deployment Process:**
1. New pods created (up to maxSurge)
2. New pods become ready (pass readiness probe)
3. Old pods terminated (respecting maxUnavailable)
4. Repeat until all pods updated

### Blue-Green Deployment

```typescript
// Deploy blue version (current)
const blueDeployment = createDeployment({
  name: 'api-server-blue',
  image: 'myregistry.io/api-server:v1.2.3',
  replicas: 5,
  port: 8080,
  labels: { app: 'api-server', version: 'blue' },
});

// Deploy green version (new)
const greenDeployment = createDeployment({
  name: 'api-server-green',
  image: 'myregistry.io/api-server:v1.2.4',
  replicas: 5,
  port: 8080,
  labels: { app: 'api-server', version: 'green' },
});

// Service initially points to blue
const service = createService({
  name: 'api-server',
  port: 80,
  targetPort: 8080,
  selector: { app: 'api-server', version: 'blue' },
});
```

**Switch Traffic:**
```bash
# Test green deployment
kubectl port-forward deployment/api-server-green 8080:8080

# Switch service to green
kubectl patch service api-server -p '{"spec":{"selector":{"version":"green"}}}'

# Verify traffic switched
kubectl describe service api-server

# Rollback if needed
kubectl patch service api-server -p '{"spec":{"selector":{"version":"blue"}}}'

# Delete old blue deployment
kubectl delete deployment api-server-blue
```

### Canary Deployment

```typescript
// 90% traffic to stable version
const stableDeployment = createDeployment({
  name: 'api-server-stable',
  image: 'myregistry.io/api-server:v1.2.3',
  replicas: 9,
  port: 8080,
  labels: { app: 'api-server', track: 'stable' },
});

// 10% traffic to canary version
const canaryDeployment = createDeployment({
  name: 'api-server-canary',
  image: 'myregistry.io/api-server:v1.2.4',
  replicas: 1,
  port: 8080,
  labels: { app: 'api-server', track: 'canary' },
});

// Service routes to both (weighted by replica count)
const service = createService({
  name: 'api-server',
  port: 80,
  targetPort: 8080,
  selector: { app: 'api-server' }, // Matches both stable and canary
});
```

**Canary Promotion:**
```bash
# Monitor canary metrics
kubectl logs -l track=canary -n production --tail=100

# Gradually increase canary replicas
kubectl scale deployment api-server-canary --replicas=3
kubectl scale deployment api-server-stable --replicas=7

# Full rollout
kubectl scale deployment api-server-canary --replicas=10
kubectl scale deployment api-server-stable --replicas=0
kubectl delete deployment api-server-stable

# Rename canary to stable
kubectl patch deployment api-server-canary -p '{"metadata":{"name":"api-server-stable"}}'
```

---

## ConfigMaps and Secrets

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
  format: json
`,
    'nginx.conf': `
events {}
http {
  server {
    listen 80;
    location / {
      proxy_pass http://localhost:8080;
    }
  }
}
`,
  },
});

console.log(toYAML(appConfig));
```

### Secrets for Sensitive Data

```typescript
import { createSecret, tlsSecret } from '@dcyfr/ai-kubernetes';

// Database credentials
const dbSecret = createSecret({
  name: 'db-credentials',
  namespace: 'production',
  type: 'Opaque',
  stringData: {
    username: 'admin',
    password: 'super-secret-password',
    url: 'postgresql://admin:super-secret-password@db.example.com:5432/mydb',
  },
});

// TLS certificate
const tlsCert = tlsSecret({
  name: 'api-tls-cert',
  namespace: 'production',
  cert: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
  key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
});

console.log(toYAML(dbSecret));
console.log(toYAML(tlsCert));
```

**Creating Secrets from Files:**
```bash
# From literal values
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=secret \
  -n production

# From files
kubectl create secret tls api-tls-cert \
  --cert=tls.crt \
  --key=tls.key \
  -n production

# Verify (base64 encoded)
kubectl get secret db-credentials -o yaml
```

---

## Ingress Configuration

### NGINX Ingress Controller

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
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
    'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
    'nginx.ingress.kubernetes.io/force-ssl-redirect': 'true',
  },
});

// Add routing rule
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

// Add TLS
ingress = addIngressTLS(ingress, {
  hosts: ['example.com'],
  secretName: 'example-com-tls',
});

console.log(toYAML(ingress));
```

---

## Persistent Storage

### PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

### Using PVC in Deployment

```typescript
const deployment = createDeployment({
  name: 'postgres',
  image: 'postgres:16',
  replicas: 1,
  port: 5432,
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
```

---

## Production Checklist

Before deploying to production:

- [ ] **Resources**: Set CPU/memory requests and limits
- [ ] **Health Probes**: Configure liveness, readiness, startup probes
- [ ] **Replicas**: Run ≥3 replicas for high availability
- [ ] **HPA**: Configure horizontal pod autoscaling
- [ ] **Secrets**: Use Secrets for sensitive data (not ConfigMaps)
- [ ] **TLS**: Enable HTTPS with valid certificates
- [ ] **RBAC**: Implement role-based access control
- [ ] **Network Policies**: Restrict pod-to-pod communication
- [ ] **Resource Quotas**: Set namespace-level resource limits
- [ ] **Monitoring**: Install Prometheus + Grafana
- [ ] **Logging**: Configure centralized logging (ELK, Loki)
- [ ] **Backup**: Implement etcd backup strategy
- [ ] **Disaster Recovery**: Document recovery procedures
- [ ] **CI/CD**: Automate deployments with GitOps (ArgoCD, Flux)

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common deployment issues and solutions.

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
