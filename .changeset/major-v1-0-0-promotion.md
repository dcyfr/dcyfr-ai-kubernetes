---
'@dcyfr/ai-kubernetes': major
---

**Production Release v1.0.0 — Kubernetes Deployment Toolkit**

Promote @dcyfr/ai-kubernetes to production-ready v1.0.0 with comprehensive K8s manifest generation, Helm chart support, and enterprise-grade quality.

**Features:**
- ✅ **Manifest Generation** — Deployment, Service, ConfigMap, Secret, Ingress, HPA builders
- ✅ **Helm Charts** — Chart generation, dependency management, template rendering
- ✅ **Health Probes** — HTTP, TCP, exec probes with customizable parameters
- ✅ **Resource Management** — CPU/memory limits, resource profiles (small/medium/large/AI)
- ✅ **Type-Safe** — Full TypeScript types with Zod validation
- ✅ **YAML Utilities** — Kubernetes YAML serialization, multi-doc support
- ✅ **Best Practices** — Standard labels, resource validation, manifest validation

**Quality Metrics:**
- 84.06% line coverage, 79.77% branch coverage
- 146/146 tests passing (23 test suites)
- ESLint clean (0 violations)
- Strict TypeScript compilation

**Migration Path:**
Install via npm:
```bash
npm install @dcyfr/ai-kubernetes
```

Generate Kubernetes manifests programmatically:
```typescript
import { createDeployment, createService, toYAML } from '@dcyfr/ai-kubernetes';

const deployment = createDeployment({
  name: 'my-app',
  image: 'my-app:latest',
  replicas: 3,
  resources: { cpu: '500m', memory: '512Mi' }
});

console.log(toYAML(deployment));
```

**Documentation:**
- [API Reference](docs/API.md) — 3,124 words, comprehensive examples
- [Security Guide](docs/SECURITY.md) — 14,520 bytes, best practices
