/**
 * Tests for utils module — yaml, validation, labels
 */

import { describe, it, expect } from 'vitest';
import {
  toYAML,
  toMultiDocYAML,
  validateDeployment,
  validateService,
  validateConfigMap,
  validateIngress,
  validateHPA,
  validateManifest,
  standardLabels,
  appLabels,
  envLabels,
  mergeLabels,
  isValidLabelKey,
  isValidLabelValue,
  ANNOTATIONS,
} from '../src/utils/index.js';
import { createDeployment } from '../src/manifests/deployment.js';
import { createService } from '../src/manifests/service.js';
import { createConfigMap } from '../src/manifests/configmap.js';
import { createIngress } from '../src/manifests/ingress.js';
import { createHPA } from '../src/manifests/hpa.js';

// ─── YAML ─────────────────────────────────────────────────────────

describe('toYAML', () => {
  it('serializes simple object', () => {
    const yaml = toYAML({ name: 'test', count: 3 });
    expect(yaml).toContain('name: test');
    expect(yaml).toContain('count: 3');
  });

  it('serializes nested objects', () => {
    const yaml = toYAML({ spec: { replicas: 2 } });
    expect(yaml).toContain('spec:');
    expect(yaml).toContain('  replicas: 2');
  });

  it('serializes arrays', () => {
    const yaml = toYAML({ items: ['a', 'b', 'c'] });
    expect(yaml).toContain('- a');
    expect(yaml).toContain('- b');
  });

  it('handles null and undefined', () => {
    expect(toYAML(null)).toBe('null');
    expect(toYAML(undefined)).toBe('null');
  });

  it('handles booleans', () => {
    expect(toYAML(true)).toBe('true');
    expect(toYAML(false)).toBe('false');
  });

  it('quotes strings with special chars', () => {
    const yaml = toYAML({ path: '/api:v1' });
    expect(yaml).toContain('"');
  });

  it('skips undefined values in objects', () => {
    const yaml = toYAML({ a: 1, b: undefined, c: 3 });
    expect(yaml).not.toContain('b:');
    expect(yaml).toContain('a: 1');
    expect(yaml).toContain('c: 3');
  });
});

describe('toMultiDocYAML', () => {
  it('separates resources with ---', () => {
    const yaml = toMultiDocYAML([{ kind: 'Deployment' }, { kind: 'Service' }]);
    const docs = yaml.split('---');
    expect(docs.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Validation ───────────────────────────────────────────────────

describe('validateDeployment', () => {
  it('validates a well-formed deployment', () => {
    const dep = createDeployment({
      name: 'web',
      image: 'nginx',
      resources: {
        requests: { cpu: '100m' },
        limits: { cpu: '500m' },
      },
    });
    const result = validateDeployment(dep);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('warns about missing resource limits', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' });
    const result = validateDeployment(dep);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('warns about missing probes', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' });
    const result = validateDeployment(dep);
    expect(result.warnings.some((w) => w.includes('liveness probe'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('readiness probe'))).toBe(true);
  });
});

describe('validateService', () => {
  it('validates a valid service', () => {
    const svc = createService({ name: 'web', port: 80 });
    const result = validateService(svc);
    expect(result.valid).toBe(true);
  });
});

describe('validateConfigMap', () => {
  it('warns about empty configmap', () => {
    const cm = createConfigMap({ name: 'empty' });
    const result = validateConfigMap(cm);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('validates non-empty configmap', () => {
    const cm = createConfigMap({ name: 'cfg', data: { key: 'val' } });
    const result = validateConfigMap(cm);
    expect(result.valid).toBe(true);
  });
});

describe('validateIngress', () => {
  it('validates a valid ingress', () => {
    const ing = createIngress({
      name: 'web',
      host: 'example.com',
      serviceName: 'svc',
      servicePort: 80,
      ingressClassName: 'nginx',
    });
    const result = validateIngress(ing);
    expect(result.valid).toBe(true);
  });

  it('warns about missing ingress class', () => {
    const ing = createIngress({
      name: 'web',
      host: 'example.com',
      serviceName: 'svc',
      servicePort: 80,
    });
    const result = validateIngress(ing);
    expect(result.warnings.some((w) => w.includes('ingress class'))).toBe(true);
  });
});

describe('validateHPA', () => {
  it('validates a valid HPA', () => {
    const hpa = createHPA({
      name: 'hpa',
      targetDeployment: 'web',
      maxReplicas: 10,
      cpuUtilization: 80,
    });
    const result = validateHPA(hpa);
    expect(result.valid).toBe(true);
  });

  it('warns about HPA with no metrics', () => {
    const hpa = createHPA({
      name: 'hpa',
      targetDeployment: 'web',
      maxReplicas: 10,
    });
    const result = validateHPA(hpa);
    expect(result.warnings.some((w) => w.includes('no metrics'))).toBe(true);
  });
});

describe('validateManifest', () => {
  it('dispatches to correct validator by kind', () => {
    const dep = createDeployment({ name: 'web', image: 'nginx' }) as unknown as Record<string, unknown>;
    const result = validateManifest(dep);
    expect(result.valid).toBe(true);
  });

  it('handles unknown kind gracefully', () => {
    const result = validateManifest({ kind: 'Unknown', metadata: { name: 'x' } });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('Unknown'))).toBe(true);
  });
});

// ─── Labels ───────────────────────────────────────────────────────

describe('standardLabels', () => {
  it('creates standard K8s labels', () => {
    const labels = standardLabels('web', 'prod', {
      version: '1.0.0',
      component: 'frontend',
    });
    expect(labels['app.kubernetes.io/name']).toBe('web');
    expect(labels['app.kubernetes.io/instance']).toBe('prod');
    expect(labels['app.kubernetes.io/version']).toBe('1.0.0');
    expect(labels['app.kubernetes.io/managed-by']).toBe('dcyfr');
  });
});

describe('appLabels', () => {
  it('creates simple app labels', () => {
    const labels = appLabels('web', { env: 'prod' });
    expect(labels.app).toBe('web');
    expect(labels.env).toBe('prod');
  });
});

describe('envLabels', () => {
  it('creates environment labels', () => {
    const labels = envLabels('api', 'production');
    expect(labels.app).toBe('api');
    expect(labels.environment).toBe('production');
  });
});

describe('mergeLabels', () => {
  it('merges label sets', () => {
    const merged = mergeLabels({ a: '1' }, { b: '2' }, { c: '3' });
    expect(merged).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('later values override', () => {
    const merged = mergeLabels({ a: '1' }, { a: '2' });
    expect(merged.a).toBe('2');
  });
});

describe('isValidLabelKey', () => {
  it('validates simple key', () => {
    expect(isValidLabelKey('app')).toBe(true);
  });

  it('validates prefixed key', () => {
    expect(isValidLabelKey('app.kubernetes.io/name')).toBe(true);
  });

  it('rejects empty key', () => {
    expect(isValidLabelKey('')).toBe(false);
  });

  it('rejects key starting with special char', () => {
    expect(isValidLabelKey('-app')).toBe(false);
  });
});

describe('isValidLabelValue', () => {
  it('validates simple value', () => {
    expect(isValidLabelValue('web')).toBe(true);
  });

  it('allows empty value', () => {
    expect(isValidLabelValue('')).toBe(true);
  });

  it('rejects value starting with hyphen', () => {
    expect(isValidLabelValue('-abc')).toBe(false);
  });

  it('rejects value over 63 chars', () => {
    expect(isValidLabelValue('a'.repeat(64))).toBe(false);
  });
});

describe('ANNOTATIONS', () => {
  it('has standard annotation keys', () => {
    expect(ANNOTATIONS.description).toBe('dcyfr.ai/description');
    expect(ANNOTATIONS.prometheusScrape).toBe('prometheus.io/scrape');
  });
});
