/**
 * Tests for helm module — chart, values, template
 */

import { describe, it, expect } from 'vitest';
import {
  createChart,
  addDependency,
  setChartVersion,
  setAppVersion,
  addMaintainer,
  createValues,
  setImage,
  setValueResources,
  setAutoscaling,
  setIngress,
  mergeValues,
  renderTemplate,
  deploymentTemplate,
  serviceTemplate,
  ingressTemplate,
} from '../src/helm/index.js';

// ─── Chart ────────────────────────────────────────────────────────

describe('createChart', () => {
  it('creates a chart with defaults', () => {
    const chart = createChart({ name: 'my-app' });
    expect(chart.apiVersion).toBe('v2');
    expect(chart.name).toBe('my-app');
    expect(chart.version).toBe('0.1.0');
    expect(chart.appVersion).toBe('1.0.0');
    expect(chart.type).toBe('application');
  });

  it('creates a chart with custom values', () => {
    const chart = createChart({
      name: 'api',
      version: '1.2.3',
      appVersion: '2.0.0',
      description: 'API service',
      keywords: ['api', 'rest'],
    });
    expect(chart.version).toBe('1.2.3');
    expect(chart.description).toBe('API service');
    expect(chart.keywords).toEqual(['api', 'rest']);
  });
});

describe('addDependency', () => {
  it('adds a dependency', () => {
    const chart = createChart({ name: 'app' });
    const updated = addDependency(chart, 'redis', '17.x', 'https://charts.bitnami.com/bitnami');
    expect(updated.dependencies).toHaveLength(1);
    expect(updated.dependencies![0].name).toBe('redis');
  });
});

describe('setChartVersion', () => {
  it('updates version', () => {
    const chart = createChart({ name: 'app' });
    const updated = setChartVersion(chart, '2.0.0');
    expect(updated.version).toBe('2.0.0');
  });
});

describe('setAppVersion', () => {
  it('updates app version', () => {
    const chart = createChart({ name: 'app' });
    const updated = setAppVersion(chart, '3.0.0');
    expect(updated.appVersion).toBe('3.0.0');
  });
});

describe('addMaintainer', () => {
  it('adds a maintainer', () => {
    const chart = createChart({ name: 'app' });
    const updated = addMaintainer(chart, 'Alice', 'alice@example.com');
    expect(updated.maintainers).toHaveLength(1);
    expect(updated.maintainers![0].name).toBe('Alice');
  });
});

// ─── Values ───────────────────────────────────────────────────────

describe('createValues', () => {
  it('creates values with defaults', () => {
    const vals = createValues({ image: { repository: 'nginx' } });
    expect(vals.replicaCount).toBe(1);
    expect(vals.image.repository).toBe('nginx');
    expect(vals.image.tag).toBe('latest');
    expect(vals.service.type).toBe('ClusterIP');
    expect(vals.service.port).toBe(80);
    expect(vals.ingress.enabled).toBe(false);
  });

  it('creates values with ingress', () => {
    const vals = createValues({
      image: { repository: 'api' },
      ingressEnabled: true,
      ingressHost: 'api.example.com',
    });
    expect(vals.ingress.enabled).toBe(true);
    expect(vals.ingress.hosts).toHaveLength(1);
    expect(vals.ingress.hosts[0].host).toBe('api.example.com');
  });
});

describe('setImage', () => {
  it('updates image repository and tag', () => {
    const vals = createValues({ image: { repository: 'nginx' } });
    const updated = setImage(vals, 'node', '20-alpine');
    expect(updated.image.repository).toBe('node');
    expect(updated.image.tag).toBe('20-alpine');
  });
});

describe('setValueResources', () => {
  it('sets resource requirements', () => {
    const vals = createValues({ image: { repository: 'nginx' } });
    const updated = setValueResources(vals, {
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '500m' },
    });
    expect(updated.resources?.requests?.cpu).toBe('100m');
    expect(updated.resources?.limits?.cpu).toBe('500m');
  });
});

describe('setAutoscaling', () => {
  it('enables autoscaling', () => {
    const vals = createValues({ image: { repository: 'nginx' } });
    const updated = setAutoscaling(vals, true, { min: 2, max: 10, cpu: 80 });
    expect(updated.autoscaling?.enabled).toBe(true);
    expect(updated.autoscaling?.minReplicas).toBe(2);
    expect(updated.autoscaling?.maxReplicas).toBe(10);
    expect(updated.autoscaling?.targetCPUUtilizationPercentage).toBe(80);
  });
});

describe('setIngress', () => {
  it('enables and configures ingress', () => {
    const vals = createValues({ image: { repository: 'nginx' } });
    const updated = setIngress(vals, 'app.example.com', 'nginx');
    expect(updated.ingress.enabled).toBe(true);
    expect(updated.ingress.className).toBe('nginx');
    expect(updated.ingress.hosts[0].host).toBe('app.example.com');
  });
});

describe('mergeValues', () => {
  it('merges partial overrides', () => {
    const base = createValues({ image: { repository: 'nginx' } });
    const merged = mergeValues(base, { replicaCount: 3 });
    expect(merged.replicaCount).toBe(3);
    expect(merged.image.repository).toBe('nginx');
  });
});

// ─── Template ─────────────────────────────────────────────────────

describe('renderTemplate', () => {
  it('replaces .Values patterns', () => {
    const result = renderTemplate('replicas: {{ .Values.replicaCount }}', {
      values: { replicaCount: 3 },
    });
    expect(result).toBe('replicas: 3');
  });

  it('replaces .Release.Name', () => {
    const result = renderTemplate('name: {{ .Release.Name }}', {
      values: {},
      releaseName: 'prod',
    });
    expect(result).toBe('name: prod');
  });

  it('replaces .Chart.Name', () => {
    const result = renderTemplate('chart: {{ .Chart.Name }}', {
      values: {},
      chartName: 'webapp',
    });
    expect(result).toBe('chart: webapp');
  });

  it('replaces .Release.Namespace', () => {
    const result = renderTemplate('ns: {{ .Release.Namespace }}', {
      values: {},
      namespace: 'production',
    });
    expect(result).toBe('ns: production');
  });

  it('handles nested values', () => {
    const result = renderTemplate('img: {{ .Values.image.repository }}', {
      values: { image: { repository: 'nginx' } },
    });
    expect(result).toBe('img: nginx');
  });

  it('handles missing values gracefully', () => {
    const result = renderTemplate('x: {{ .Values.missing }}', { values: {} });
    expect(result).toBe('x: ');
  });
});

describe('deploymentTemplate', () => {
  it('returns a valid template string', () => {
    const tpl = deploymentTemplate();
    expect(tpl).toContain('apiVersion: apps/v1');
    expect(tpl).toContain('{{ .Values.replicaCount }}');
    expect(tpl).toContain('{{ .Release.Name }}');
  });
});

describe('serviceTemplate', () => {
  it('returns a valid template string', () => {
    const tpl = serviceTemplate();
    expect(tpl).toContain('kind: Service');
    expect(tpl).toContain('{{ .Values.service.type }}');
  });
});

describe('ingressTemplate', () => {
  it('returns a valid template string', () => {
    const tpl = ingressTemplate();
    expect(tpl).toContain('networking.k8s.io/v1');
    expect(tpl).toContain('{{ .Values.ingress.host }}');
  });
});
