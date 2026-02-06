/**
 * Tests for manifests module — deployment, service, configmap, ingress, namespace, hpa
 */

import { describe, it, expect } from 'vitest';
import {
  createDeployment,
  setReplicas,
  addContainer,
  setResources,
  setStrategy,
  createService,
  clusterIPService,
  nodePortService,
  loadBalancerService,
  addServicePort,
  setServiceType,
  createConfigMap,
  setConfigData,
  removeConfigData,
  configMapFromObject,
  createSecret,
  secretFromStrings,
  tlsSecret,
  setSecretData,
  createIngress,
  addIngressRule,
  addIngressTLS,
  setIngressClass,
  createNamespace,
  appNamespace,
  createHPA,
  setCPUTarget,
  setMemoryTarget,
  setScaleRange,
} from '../src/manifests/index.js';

// ─── Deployment ───────────────────────────────────────────────────

describe('createDeployment', () => {
  it('creates a basic deployment', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx:latest' });
    expect(dep.apiVersion).toBe('apps/v1');
    expect(dep.kind).toBe('Deployment');
    expect(dep.metadata.name).toBe('web');
    expect(dep.spec.replicas).toBe(1);
    expect(dep.spec.template.spec.containers).toHaveLength(1);
    expect(dep.spec.template.spec.containers[0].image).toBe('nginx:latest');
  });

  it('creates deployment with options', () => {
    const dep = createDeployment({
      name: 'api',
      image: 'node:20',
      replicas: 3,
      port: 3000,
      namespace: 'production',
      labels: { version: 'v1' },
    });
    expect(dep.spec.replicas).toBe(3);
    expect(dep.metadata.namespace).toBe('production');
    expect(dep.metadata.labels?.version).toBe('v1');
    expect(dep.spec.template.spec.containers[0].ports).toHaveLength(1);
    expect(dep.spec.template.spec.containers[0].ports![0].containerPort).toBe(3000);
  });

  it('sets app label in selector', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' });
    expect(dep.spec.selector.matchLabels.app).toBe('web');
    expect(dep.spec.template.metadata?.labels?.app).toBe('web');
  });
});

describe('setReplicas', () => {
  it('changes replica count', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' });
    const updated = setReplicas(dep, 5);
    expect(updated.spec.replicas).toBe(5);
    expect(dep.spec.replicas).toBe(1); // immutable
  });
});

describe('addContainer', () => {
  it('adds a sidecar container', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' });
    const updated = addContainer(dep, {
      name: 'sidecar',
      image: 'envoy:latest',
      imagePullPolicy: 'IfNotPresent',
    });
    expect(updated.spec.template.spec.containers).toHaveLength(2);
    expect(updated.spec.template.spec.containers[1].name).toBe('sidecar');
  });
});

describe('setResources', () => {
  it('sets resource limits on primary container', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' });
    const updated = setResources(dep, {
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '500m', memory: '512Mi' },
    });
    expect(updated.spec.template.spec.containers[0].resources?.limits?.cpu).toBe('500m');
  });
});

describe('setStrategy', () => {
  it('sets RollingUpdate strategy', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' });
    const updated = setStrategy(dep, 'RollingUpdate', {
      maxSurge: 1,
      maxUnavailable: 0,
    });
    expect(updated.spec.strategy?.type).toBe('RollingUpdate');
    expect(updated.spec.strategy?.rollingUpdate?.maxSurge).toBe(1);
  });

  it('sets Recreate strategy', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' });
    const updated = setStrategy(dep, 'Recreate');
    expect(updated.spec.strategy?.type).toBe('Recreate');
  });
});

// ─── Service ──────────────────────────────────────────────────────

describe('createService', () => {
  it('creates a basic service', () => {
    const svc = createService({ name: 'web', port: 80 });
    expect(svc.apiVersion).toBe('v1');
    expect(svc.kind).toBe('Service');
    expect(svc.spec.type).toBe('ClusterIP');
    expect(svc.spec.ports).toHaveLength(1);
    expect(svc.spec.ports[0].port).toBe(80);
    expect(svc.spec.selector.app).toBe('web');
  });
});

describe('clusterIPService', () => {
  it('creates ClusterIP service', () => {
    const svc = clusterIPService('api', 3000, 8080);
    expect(svc.spec.type).toBe('ClusterIP');
    expect(svc.spec.ports[0].targetPort).toBe(8080);
  });
});

describe('nodePortService', () => {
  it('creates NodePort service', () => {
    const svc = nodePortService('web', 80, 30080);
    expect(svc.spec.type).toBe('NodePort');
    expect(svc.spec.ports[0].nodePort).toBe(30080);
  });
});

describe('loadBalancerService', () => {
  it('creates LoadBalancer service', () => {
    const svc = loadBalancerService('lb', 443);
    expect(svc.spec.type).toBe('LoadBalancer');
  });
});

describe('addServicePort', () => {
  it('adds a port to service', () => {
    const svc = createService({ name: 'web', port: 80 });
    const updated = addServicePort(svc, { port: 443, targetPort: 8443, protocol: 'TCP' });
    expect(updated.spec.ports).toHaveLength(2);
  });
});

describe('setServiceType', () => {
  it('changes service type', () => {
    const svc = createService({ name: 'web', port: 80 });
    const updated = setServiceType(svc, 'LoadBalancer');
    expect(updated.spec.type).toBe('LoadBalancer');
  });
});

// ─── ConfigMap ────────────────────────────────────────────────────

describe('createConfigMap', () => {
  it('creates a configmap', () => {
    const cm = createConfigMap({ name: 'app-config', data: { key: 'value' } });
    expect(cm.kind).toBe('ConfigMap');
    expect(cm.data?.key).toBe('value');
  });
});

describe('setConfigData', () => {
  it('sets a key', () => {
    const cm = createConfigMap({ name: 'cfg' });
    const updated = setConfigData(cm, 'color', 'blue');
    expect(updated.data?.color).toBe('blue');
  });
});

describe('removeConfigData', () => {
  it('removes a key', () => {
    const cm = createConfigMap({ name: 'cfg', data: { a: '1', b: '2' } });
    const updated = removeConfigData(cm, 'a');
    expect(updated.data?.a).toBeUndefined();
    expect(updated.data?.b).toBe('2');
  });
});

describe('configMapFromObject', () => {
  it('serializes non-string values to JSON', () => {
    const cm = configMapFromObject('cfg', { port: 3000, debug: true });
    expect(cm.data?.port).toBe('3000');
    expect(cm.data?.debug).toBe('true');
  });
});

// ─── Secret ───────────────────────────────────────────────────────

describe('createSecret', () => {
  it('creates an opaque secret', () => {
    const s = createSecret({ name: 'db-creds', stringData: { password: 'pass' } });
    expect(s.kind).toBe('Secret');
    expect(s.type).toBe('Opaque');
  });
});

describe('secretFromStrings', () => {
  it('creates a secret from key-value pairs', () => {
    const s = secretFromStrings('creds', { user: 'admin', pass: 'secret' });
    expect(s.stringData?.user).toBe('admin');
  });
});

describe('tlsSecret', () => {
  it('creates a TLS secret', () => {
    const s = tlsSecret('tls-cert', 'cert-data', 'key-data');
    expect(s.type).toBe('kubernetes.io/tls');
    expect(s.stringData?.['tls.crt']).toBe('cert-data');
    expect(s.stringData?.['tls.key']).toBe('key-data');
  });
});

describe('setSecretData', () => {
  it('adds a key to a secret', () => {
    const s = createSecret({ name: 'test' });
    const updated = setSecretData(s, 'token', 'abc123');
    expect(updated.stringData?.token).toBe('abc123');
  });
});

// ─── Ingress ──────────────────────────────────────────────────────

describe('createIngress', () => {
  it('creates an ingress', () => {
    const ing = createIngress({
      name: 'web',
      host: 'example.com',
      serviceName: 'web-svc',
      servicePort: 80,
    });
    expect(ing.apiVersion).toBe('networking.k8s.io/v1');
    expect(ing.kind).toBe('Ingress');
    expect(ing.spec.rules).toHaveLength(1);
    expect(ing.spec.rules[0].host).toBe('example.com');
  });

  it('adds TLS when enabled', () => {
    const ing = createIngress({
      name: 'web',
      host: 'example.com',
      serviceName: 'web-svc',
      servicePort: 80,
      tls: true,
    });
    expect(ing.spec.tls).toHaveLength(1);
    expect(ing.spec.tls![0].hosts).toContain('example.com');
  });
});

describe('addIngressRule', () => {
  it('adds another host rule', () => {
    const ing = createIngress({
      name: 'web',
      host: 'a.com',
      serviceName: 'svc-a',
      servicePort: 80,
    });
    const updated = addIngressRule(ing, 'b.com', 'svc-b', 8080);
    expect(updated.spec.rules).toHaveLength(2);
    expect(updated.spec.rules[1].host).toBe('b.com');
  });
});

describe('addIngressTLS', () => {
  it('adds TLS config', () => {
    const ing = createIngress({
      name: 'web',
      host: 'example.com',
      serviceName: 'svc',
      servicePort: 80,
    });
    const updated = addIngressTLS(ing, ['example.com'], 'tls-secret');
    expect(updated.spec.tls).toHaveLength(1);
    expect(updated.spec.tls![0].secretName).toBe('tls-secret');
  });
});

describe('setIngressClass', () => {
  it('sets ingress class name', () => {
    const ing = createIngress({
      name: 'web',
      host: 'example.com',
      serviceName: 'svc',
      servicePort: 80,
    });
    const updated = setIngressClass(ing, 'nginx');
    expect(updated.spec.ingressClassName).toBe('nginx');
  });
});

// ─── Namespace ────────────────────────────────────────────────────

describe('createNamespace', () => {
  it('creates a namespace', () => {
    const ns = createNamespace({ name: 'prod' });
    expect(ns.kind).toBe('Namespace');
    expect(ns.metadata.name).toBe('prod');
  });
});

describe('appNamespace', () => {
  it('creates a namespace with managed-by label', () => {
    const ns = appNamespace('staging', 'platform');
    expect(ns.metadata.labels?.['app.kubernetes.io/managed-by']).toBe('dcyfr');
    expect(ns.metadata.labels?.team).toBe('platform');
  });
});

// ─── HPA ──────────────────────────────────────────────────────────

describe('createHPA', () => {
  it('creates an HPA with CPU target', () => {
    const hpa = createHPA({
      name: 'web-hpa',
      targetDeployment: 'web',
      maxReplicas: 10,
      cpuUtilization: 80,
    });
    expect(hpa.apiVersion).toBe('autoscaling/v2');
    expect(hpa.kind).toBe('HorizontalPodAutoscaler');
    expect(hpa.spec.scaleTargetRef.name).toBe('web');
    expect(hpa.spec.maxReplicas).toBe(10);
    expect(hpa.spec.metrics).toHaveLength(1);
  });

  it('creates an HPA with CPU and memory targets', () => {
    const hpa = createHPA({
      name: 'api-hpa',
      targetDeployment: 'api',
      maxReplicas: 20,
      cpuUtilization: 70,
      memoryUtilization: 80,
    });
    expect(hpa.spec.metrics).toHaveLength(2);
  });
});

describe('setCPUTarget', () => {
  it('sets CPU utilization target', () => {
    const hpa = createHPA({ name: 'hpa', targetDeployment: 'web', maxReplicas: 5 });
    const updated = setCPUTarget(hpa, 60);
    expect(updated.spec.metrics).toHaveLength(1);
    expect(updated.spec.metrics![0].resource?.target.averageUtilization).toBe(60);
  });
});

describe('setMemoryTarget', () => {
  it('sets memory utilization target', () => {
    const hpa = createHPA({ name: 'hpa', targetDeployment: 'web', maxReplicas: 5 });
    const updated = setMemoryTarget(hpa, 75);
    expect(updated.spec.metrics).toHaveLength(1);
    expect(updated.spec.metrics![0].resource?.name).toBe('memory');
  });
});

describe('setScaleRange', () => {
  it('sets min/max replicas', () => {
    const hpa = createHPA({ name: 'hpa', targetDeployment: 'web', maxReplicas: 5 });
    const updated = setScaleRange(hpa, 2, 15);
    expect(updated.spec.minReplicas).toBe(2);
    expect(updated.spec.maxReplicas).toBe(15);
  });
});
