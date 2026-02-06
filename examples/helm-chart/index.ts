/**
 * Example: Helm chart generation
 *
 * Demonstrates creating a Helm chart with values,
 * templates, and rendering.
 */

import {
  createChart,
  addDependency,
  addMaintainer,
  createValues,
  setAutoscaling,
  setIngress,
  renderTemplate,
  deploymentTemplate,
  serviceTemplate,
  toYAML,
} from '../../src/index.js';

// 1. Create Chart.yaml
let chart = createChart({
  name: 'ai-service',
  version: '1.0.0',
  appVersion: '2.0.0',
  description: 'AI inference service Helm chart',
  keywords: ['ai', 'inference', 'ml'],
});

chart = addMaintainer(chart, 'DCYFR Team', 'hello@dcyfr.ai', 'https://dcyfr.ai');
chart = addDependency(chart, 'redis', '18.x', 'https://charts.bitnami.com/bitnami', 'redis.enabled');

console.log('=== Chart.yaml ===\n');
console.log(toYAML(chart));

// 2. Create values.yaml
let values = createValues({
  image: { repository: 'ghcr.io/dcyfr/ai-service', tag: '2.0.0' },
  servicePort: 8080,
  resources: {
    requests: { cpu: '500m', memory: '1Gi' },
    limits: { cpu: '2000m', memory: '4Gi' },
  },
});

values = setAutoscaling(values, true, { min: 2, max: 20, cpu: 70, memory: 80 });
values = setIngress(values, 'ai.dcyfr.ai', 'nginx');

console.log('\n=== values.yaml ===\n');
console.log(toYAML(values));

// 3. Render templates
const context = {
  values: values as unknown as Record<string, unknown>,
  releaseName: 'prod',
  chartName: 'ai-service',
  namespace: 'ai',
};

console.log('\n=== Rendered Deployment ===\n');
console.log(renderTemplate(deploymentTemplate(), context));

console.log('\n=== Rendered Service ===\n');
console.log(renderTemplate(serviceTemplate(), context));
