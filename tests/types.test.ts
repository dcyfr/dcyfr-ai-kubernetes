/**
 * Tests for types/index.ts — Zod schema validation
 */

import { describe, it, expect } from 'vitest';
import {
  MetadataSchema,
  ContainerPortSchema,
  EnvVarSchema,
  ResourceRequirementsSchema,
  VolumeMountSchema,
  VolumeSchema,
  ProbeSchema,
  ContainerSchema,
  DeploymentSchema,
  ServiceSchema,
  ConfigMapSchema,
  SecretSchema,
  IngressSchema,
  NamespaceSchema,
  HPASchema,
  HelmChartSchema,
  HelmValuesSchema,
} from '../src/types/index.js';

describe('MetadataSchema', () => {
  it('validates valid metadata', () => {
    const result = MetadataSchema.safeParse({
      name: 'my-app',
      namespace: 'default',
      labels: { app: 'my-app' },
    });
    expect(result.success).toBe(true);
  });

  it('requires name', () => {
    const result = MetadataSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = MetadataSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('allows optional namespace', () => {
    const result = MetadataSchema.safeParse({ name: 'test' });
    expect(result.success).toBe(true);
  });
});

describe('ContainerPortSchema', () => {
  it('validates valid port', () => {
    const result = ContainerPortSchema.safeParse({ containerPort: 8080 });
    expect(result.success).toBe(true);
  });

  it('rejects out of range port', () => {
    const result = ContainerPortSchema.safeParse({ containerPort: 70000 });
    expect(result.success).toBe(false);
  });

  it('defaults protocol to TCP', () => {
    const result = ContainerPortSchema.parse({ containerPort: 80 });
    expect(result.protocol).toBe('TCP');
  });
});

describe('EnvVarSchema', () => {
  it('validates simple env var', () => {
    const result = EnvVarSchema.safeParse({ name: 'PORT', value: '3000' });
    expect(result.success).toBe(true);
  });

  it('validates env var from configmap', () => {
    const result = EnvVarSchema.safeParse({
      name: 'DB_HOST',
      valueFrom: { configMapKeyRef: { name: 'db-config', key: 'host' } },
    });
    expect(result.success).toBe(true);
  });

  it('validates env var from secret', () => {
    const result = EnvVarSchema.safeParse({
      name: 'DB_PASSWORD',
      valueFrom: { secretKeyRef: { name: 'db-secret', key: 'password' } },
    });
    expect(result.success).toBe(true);
  });
});

describe('ResourceRequirementsSchema', () => {
  it('validates resource requirements', () => {
    const result = ResourceRequirementsSchema.safeParse({
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '500m', memory: '512Mi' },
    });
    expect(result.success).toBe(true);
  });

  it('allows empty', () => {
    const result = ResourceRequirementsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('VolumeMountSchema', () => {
  it('validates volume mount', () => {
    const result = VolumeMountSchema.safeParse({
      name: 'config-vol',
      mountPath: '/etc/config',
    });
    expect(result.success).toBe(true);
    expect(result.data?.readOnly).toBe(false);
  });
});

describe('VolumeSchema', () => {
  it('validates configMap volume', () => {
    const result = VolumeSchema.safeParse({
      name: 'config-vol',
      configMap: { name: 'my-config' },
    });
    expect(result.success).toBe(true);
  });

  it('validates emptyDir volume', () => {
    const result = VolumeSchema.safeParse({
      name: 'tmp',
      emptyDir: {},
    });
    expect(result.success).toBe(true);
  });
});

describe('ProbeSchema', () => {
  it('validates http probe', () => {
    const result = ProbeSchema.safeParse({
      httpGet: { path: '/healthz', port: 8080 },
    });
    expect(result.success).toBe(true);
  });

  it('validates tcp probe', () => {
    const result = ProbeSchema.safeParse({
      tcpSocket: { port: 3306 },
      periodSeconds: 15,
    });
    expect(result.success).toBe(true);
  });

  it('validates exec probe', () => {
    const result = ProbeSchema.safeParse({
      exec: { command: ['cat', '/tmp/healthy'] },
    });
    expect(result.success).toBe(true);
  });
});

describe('ContainerSchema', () => {
  it('validates minimal container', () => {
    const result = ContainerSchema.safeParse({
      name: 'app',
      image: 'nginx:latest',
    });
    expect(result.success).toBe(true);
  });

  it('validates full container', () => {
    const result = ContainerSchema.safeParse({
      name: 'app',
      image: 'node:20',
      ports: [{ containerPort: 3000 }],
      env: [{ name: 'NODE_ENV', value: 'production' }],
      resources: {
        requests: { cpu: '100m', memory: '128Mi' },
        limits: { cpu: '500m', memory: '512Mi' },
      },
      livenessProbe: { httpGet: { path: '/healthz', port: 3000 } },
      readinessProbe: { httpGet: { path: '/readyz', port: 3000 } },
    });
    expect(result.success).toBe(true);
  });
});

describe('DeploymentSchema', () => {
  it('validates a deployment', () => {
    const result = DeploymentSchema.safeParse({
      metadata: { name: 'my-app' },
      spec: {
        selector: { matchLabels: { app: 'my-app' } },
        template: {
          spec: {
            containers: [{ name: 'app', image: 'nginx' }],
          },
        },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.apiVersion).toBe('apps/v1');
    expect(result.data?.kind).toBe('Deployment');
  });
});

describe('ServiceSchema', () => {
  it('validates a service', () => {
    const result = ServiceSchema.safeParse({
      metadata: { name: 'my-svc' },
      spec: {
        selector: { app: 'my-app' },
        ports: [{ port: 80, targetPort: 3000 }],
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.spec.type).toBe('ClusterIP');
  });
});

describe('ConfigMapSchema', () => {
  it('validates a configmap', () => {
    const result = ConfigMapSchema.safeParse({
      metadata: { name: 'my-config' },
      data: { key: 'value' },
    });
    expect(result.success).toBe(true);
    expect(result.data?.kind).toBe('ConfigMap');
  });
});

describe('SecretSchema', () => {
  it('validates a secret', () => {
    const result = SecretSchema.safeParse({
      metadata: { name: 'my-secret' },
      stringData: { password: 'hunter2' },
    });
    expect(result.success).toBe(true);
    expect(result.data?.type).toBe('Opaque');
  });
});

describe('IngressSchema', () => {
  it('validates an ingress', () => {
    const result = IngressSchema.safeParse({
      metadata: { name: 'my-ingress' },
      spec: {
        rules: [
          {
            host: 'example.com',
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: { name: 'my-svc', port: { number: 80 } },
                  },
                },
              ],
            },
          },
        ],
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.apiVersion).toBe('networking.k8s.io/v1');
  });
});

describe('NamespaceSchema', () => {
  it('validates a namespace', () => {
    const result = NamespaceSchema.safeParse({
      metadata: { name: 'my-ns' },
    });
    expect(result.success).toBe(true);
    expect(result.data?.kind).toBe('Namespace');
  });
});

describe('HPASchema', () => {
  it('validates an HPA', () => {
    const result = HPASchema.safeParse({
      metadata: { name: 'my-hpa' },
      spec: {
        scaleTargetRef: { name: 'my-app' },
        maxReplicas: 10,
        metrics: [
          {
            type: 'Resource',
            resource: {
              name: 'cpu',
              target: { type: 'Utilization', averageUtilization: 80 },
            },
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('HelmChartSchema', () => {
  it('validates a chart', () => {
    const result = HelmChartSchema.safeParse({
      name: 'my-chart',
    });
    expect(result.success).toBe(true);
    expect(result.data?.apiVersion).toBe('v2');
    expect(result.data?.version).toBe('0.1.0');
  });
});

describe('HelmValuesSchema', () => {
  it('validates helm values', () => {
    const result = HelmValuesSchema.safeParse({
      image: { repository: 'nginx' },
      service: {},
      ingress: {},
    });
    expect(result.success).toBe(true);
    expect(result.data?.replicaCount).toBe(1);
  });
});
