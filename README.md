# @dcyfr/ai-kubernetes

Kubernetes deployment template — generate, validate, and manage K8s manifests and Helm charts programmatically.

## Features

- **Manifest Builders** — Deployment, Service, ConfigMap, Secret, Ingress, Namespace, HPA
- **Helm Chart Generation** — Chart.yaml, values.yaml, template rendering
- **Health Probes** — Liveness, readiness, startup probe presets
- **Resource Profiles** — Small, medium, large, AI resource presets
- **YAML Serialization** — Zero-dependency YAML output
- **Validation** — Manifest validation with errors and warnings
- **Labels & Annotations** — Standard K8s label helpers

## Quick Start

```typescript
import {
  createDeployment,
  createService,
  standardProbes,
  mediumResources,
  setResources,
  toYAML,
} from '@dcyfr/ai-kubernetes';

// Create a deployment with probes and resources
const probes = standardProbes(3000);
let deployment = createDeployment({
  name: 'my-app',
  image: 'node:20',
  replicas: 3,
  port: 3000,
  livenessProbe: probes.livenessProbe,
  readinessProbe: probes.readinessProbe,
});
deployment = setResources(deployment, mediumResources());

// Create a service
const service = createService({ name: 'my-app', port: 80, targetPort: 3000 });

// Output YAML
console.log(toYAML(deployment));
console.log(toYAML(service));
```

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

| Profile | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| small   | 50m         | 200m      | 64Mi           | 256Mi        |
| medium  | 250m        | 500m      | 256Mi          | 512Mi        |
| large   | 500m        | 1000m     | 512Mi          | 1Gi          |
| ai      | 1000m       | 4000m     | 2Gi            | 8Gi          |

## Examples

- [Web App](examples/web-app/) — Full web app deployment with ingress and TLS
- [Helm Chart](examples/helm-chart/) — Generate Helm chart with values and templates
- [Microservices](examples/microservices/) — Multi-service architecture with HPA

## Development

```bash
npm install
npm test              # Run tests
npm run lint          # TypeScript check
npm run build         # Compile
npm run test:coverage # Coverage report
```

## License

MIT — see [LICENSE](LICENSE)
