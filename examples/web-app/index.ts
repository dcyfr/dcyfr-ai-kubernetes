/**
 * Example: Basic web application deployment
 *
 * Demonstrates creating a complete K8s deployment with
 * service, configmap, ingress, and health probes.
 */

import {
  createDeployment,
  setResources,
  createService,
  createConfigMap,
  createIngress,
  createNamespace,
  standardProbes,
  mediumResources,
  toYAML,
  toMultiDocYAML,
  validateDeployment,
  validateService,
  standardLabels,
} from '../../src/index.js';

// 1. Create namespace
const namespace = createNamespace({ name: 'webapp' });

// 2. Create ConfigMap for app configuration
const config = createConfigMap({
  name: 'webapp-config',
  namespace: 'webapp',
  data: {
    NODE_ENV: 'production',
    PORT: '3000',
    LOG_LEVEL: 'info',
  },
});

// 3. Create Deployment with health probes
const probes = standardProbes(3000);
let deployment = createDeployment({
  name: 'webapp',
  namespace: 'webapp',
  image: 'ghcr.io/dcyfr/webapp:1.0.0',
  replicas: 3,
  port: 3000,
  labels: standardLabels('webapp', 'prod', { version: '1.0.0' }),
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PORT', value: '3000' },
  ],
  livenessProbe: probes.livenessProbe,
  readinessProbe: probes.readinessProbe,
  startupProbe: probes.startupProbe,
});

deployment = setResources(deployment, mediumResources());

// 4. Create Service
const service = createService({
  name: 'webapp',
  namespace: 'webapp',
  port: 80,
  targetPort: 3000,
});

// 5. Create Ingress
const ingress = createIngress({
  name: 'webapp',
  namespace: 'webapp',
  host: 'webapp.example.com',
  serviceName: 'webapp',
  servicePort: 80,
  ingressClassName: 'nginx',
  tls: true,
});

// 6. Validate
const depValidation = validateDeployment(deployment);
const svcValidation = validateService(service);

console.log('=== Web Application Deployment ===\n');
console.log('Deployment validation:', depValidation.valid ? 'PASS' : 'FAIL');
if (depValidation.warnings.length > 0) {
  console.log('Warnings:', depValidation.warnings);
}
console.log('Service validation:', svcValidation.valid ? 'PASS' : 'FAIL');

// 7. Output YAML
console.log('\n--- Combined YAML ---\n');
console.log(toMultiDocYAML([namespace, config, deployment, service, ingress]));

// 8. Individual YAML
console.log('\n--- Deployment YAML ---\n');
console.log(toYAML(deployment));
