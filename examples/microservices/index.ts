/**
 * Example: Microservices architecture
 *
 * Demonstrates deploying multiple services with
 * different resource profiles, HPA, and ingress routing.
 */

import {
  createDeployment,
  setResources,
  createService,
  createIngress,
  addIngressRule,
  addIngressTLS,
  setIngressClass,
  createHPA,
  createNamespace,
  standardProbes,
  smallResources,
  mediumResources,
  largeResources,
  toMultiDocYAML,
  validateDeployment,
} from '../../src/index.js';

const ns = createNamespace({ name: 'microservices' });

// ─── API Gateway ──────────────────────────────────────────────────
const gatewayProbes = standardProbes(8080);
const gateway = setResources(
  createDeployment({
    name: 'api-gateway',
    namespace: 'microservices',
    image: 'ghcr.io/dcyfr/api-gateway:1.0.0',
    replicas: 2,
    port: 8080,
    livenessProbe: gatewayProbes.livenessProbe,
    readinessProbe: gatewayProbes.readinessProbe,
  }),
  mediumResources()
);

const gatewaySvc = createService({
  name: 'api-gateway',
  namespace: 'microservices',
  port: 80,
  targetPort: 8080,
});

// ─── User Service ─────────────────────────────────────────────────
const userProbes = standardProbes(3001);
const userService = setResources(
  createDeployment({
    name: 'user-service',
    namespace: 'microservices',
    image: 'ghcr.io/dcyfr/user-service:1.0.0',
    replicas: 2,
    port: 3001,
    livenessProbe: userProbes.livenessProbe,
    readinessProbe: userProbes.readinessProbe,
  }),
  smallResources()
);

const userSvc = createService({
  name: 'user-service',
  namespace: 'microservices',
  port: 80,
  targetPort: 3001,
});

// ─── AI Inference ─────────────────────────────────────────────────
const aiProbes = standardProbes(5000);
const aiService = setResources(
  createDeployment({
    name: 'ai-inference',
    namespace: 'microservices',
    image: 'ghcr.io/dcyfr/ai-inference:1.0.0',
    replicas: 1,
    port: 5000,
    livenessProbe: aiProbes.livenessProbe,
    readinessProbe: aiProbes.readinessProbe,
  }),
  largeResources()
);

const aiSvc = createService({
  name: 'ai-inference',
  namespace: 'microservices',
  port: 80,
  targetPort: 5000,
});

// HPA for AI service
const aiHPA = createHPA({
  name: 'ai-inference-hpa',
  namespace: 'microservices',
  targetDeployment: 'ai-inference',
  minReplicas: 1,
  maxReplicas: 8,
  cpuUtilization: 60,
  memoryUtilization: 70,
});

// ─── Ingress ──────────────────────────────────────────────────────
let ingress = createIngress({
  name: 'microservices',
  namespace: 'microservices',
  host: 'api.dcyfr.ai',
  serviceName: 'api-gateway',
  servicePort: 80,
});

ingress = addIngressRule(ingress, 'users.dcyfr.ai', 'user-service', 80);
ingress = addIngressRule(ingress, 'ai.dcyfr.ai', 'ai-inference', 80);
ingress = setIngressClass(ingress, 'nginx');
ingress = addIngressTLS(ingress, ['api.dcyfr.ai', 'users.dcyfr.ai', 'ai.dcyfr.ai'], 'dcyfr-tls');

// ─── Validate ─────────────────────────────────────────────────────
const deployments = [gateway, userService, aiService];
console.log('=== Microservices Validation ===\n');
for (const dep of deployments) {
  const result = validateDeployment(dep);
  console.log(`${dep.metadata.name}: ${result.valid ? 'PASS' : 'FAIL'}`);
  if (result.warnings.length > 0) {
    console.log(`  Warnings: ${result.warnings.length}`);
  }
}

// ─── Output ───────────────────────────────────────────────────────
console.log('\n=== Full Manifest ===\n');
console.log(
  toMultiDocYAML([
    ns,
    gateway,
    gatewaySvc,
    userService,
    userSvc,
    aiService,
    aiSvc,
    aiHPA,
    ingress,
  ])
);
