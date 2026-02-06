/**
 * Tests for health module — probes and resources
 */

import { describe, it, expect } from 'vitest';
import {
  httpProbe,
  httpsProbe,
  tcpProbe,
  execProbe,
  livenessProbe,
  readinessProbe,
  startupProbe,
  standardProbes,
  createResources,
  smallResources,
  mediumResources,
  largeResources,
  aiResources,
  getResourceProfile,
  parseCPU,
  parseMemory,
  validateResources,
} from '../src/health/index.js';

// ─── Probes ───────────────────────────────────────────────────────

describe('httpProbe', () => {
  it('creates an HTTP probe', () => {
    const probe = httpProbe('/health', 8080);
    expect(probe.httpGet?.path).toBe('/health');
    expect(probe.httpGet?.port).toBe(8080);
    expect(probe.httpGet?.scheme).toBe('HTTP');
  });

  it('applies custom options', () => {
    const probe = httpProbe('/health', 8080, {
      initialDelaySeconds: 30,
      periodSeconds: 15,
    });
    expect(probe.initialDelaySeconds).toBe(30);
    expect(probe.periodSeconds).toBe(15);
  });
});

describe('httpsProbe', () => {
  it('creates an HTTPS probe', () => {
    const probe = httpsProbe('/health', 443);
    expect(probe.httpGet?.scheme).toBe('HTTPS');
  });
});

describe('tcpProbe', () => {
  it('creates a TCP probe', () => {
    const probe = tcpProbe(3306);
    expect(probe.tcpSocket?.port).toBe(3306);
    expect(probe.httpGet).toBeUndefined();
  });
});

describe('execProbe', () => {
  it('creates an exec probe', () => {
    const probe = execProbe(['cat', '/tmp/healthy']);
    expect(probe.exec?.command).toEqual(['cat', '/tmp/healthy']);
  });
});

describe('livenessProbe', () => {
  it('creates a standard liveness probe', () => {
    const probe = livenessProbe(3000);
    expect(probe.httpGet?.path).toBe('/healthz');
    expect(probe.initialDelaySeconds).toBe(15);
  });

  it('allows custom path', () => {
    const probe = livenessProbe(3000, '/api/health');
    expect(probe.httpGet?.path).toBe('/api/health');
  });
});

describe('readinessProbe', () => {
  it('creates a standard readiness probe', () => {
    const probe = readinessProbe(3000);
    expect(probe.httpGet?.path).toBe('/readyz');
    expect(probe.initialDelaySeconds).toBe(5);
  });
});

describe('startupProbe', () => {
  it('creates a startup probe with generous failure threshold', () => {
    const probe = startupProbe(3000);
    expect(probe.httpGet?.path).toBe('/healthz');
    expect(probe.failureThreshold).toBe(30);
  });
});

describe('standardProbes', () => {
  it('creates all three probes', () => {
    const probes = standardProbes(3000);
    expect(probes.livenessProbe.httpGet?.path).toBe('/healthz');
    expect(probes.readinessProbe.httpGet?.path).toBe('/readyz');
    expect(probes.startupProbe.httpGet?.path).toBe('/healthz');
  });

  it('allows custom paths', () => {
    const probes = standardProbes(8080, {
      livenessPath: '/live',
      readinessPath: '/ready',
      startupPath: '/startup',
    });
    expect(probes.livenessProbe.httpGet?.path).toBe('/live');
    expect(probes.readinessProbe.httpGet?.path).toBe('/ready');
    expect(probes.startupProbe.httpGet?.path).toBe('/startup');
  });
});

// ─── Resources ────────────────────────────────────────────────────

describe('createResources', () => {
  it('creates resource requirements', () => {
    const res = createResources({
      cpuRequest: '100m',
      cpuLimit: '500m',
      memoryRequest: '128Mi',
      memoryLimit: '512Mi',
    });
    expect(res.requests?.cpu).toBe('100m');
    expect(res.limits?.memory).toBe('512Mi');
  });
});

describe('resource profiles', () => {
  it('small resources', () => {
    const res = smallResources();
    expect(res.requests?.cpu).toBe('50m');
    expect(res.limits?.memory).toBe('256Mi');
  });

  it('medium resources', () => {
    const res = mediumResources();
    expect(res.requests?.cpu).toBe('250m');
  });

  it('large resources', () => {
    const res = largeResources();
    expect(res.requests?.cpu).toBe('500m');
    expect(res.limits?.cpu).toBe('1000m');
  });

  it('ai resources', () => {
    const res = aiResources();
    expect(res.requests?.cpu).toBe('1000m');
    expect(res.limits?.memory).toBe('8Gi');
  });
});

describe('getResourceProfile', () => {
  it('gets profile by name', () => {
    const res = getResourceProfile('medium');
    expect(res.requests?.cpu).toBe('250m');
  });
});

describe('parseCPU', () => {
  it('parses millicores', () => {
    expect(parseCPU('500m')).toBe(500);
  });

  it('parses whole cores', () => {
    expect(parseCPU('2')).toBe(2000);
  });

  it('parses fractional cores', () => {
    expect(parseCPU('1.5')).toBe(1500);
  });
});

describe('parseMemory', () => {
  it('parses Mi', () => {
    expect(parseMemory('256Mi')).toBe(256 * 1024 * 1024);
  });

  it('parses Gi', () => {
    expect(parseMemory('1Gi')).toBe(1024 * 1024 * 1024);
  });

  it('parses Ki', () => {
    expect(parseMemory('512Ki')).toBe(512 * 1024);
  });

  it('parses plain bytes', () => {
    expect(parseMemory('1048576')).toBe(1048576);
  });
});

describe('validateResources', () => {
  it('passes for valid resources', () => {
    const errors = validateResources({
      requests: { cpu: '100m', memory: '128Mi' },
      limits: { cpu: '500m', memory: '512Mi' },
    });
    expect(errors).toEqual([]);
  });

  it('detects CPU request exceeding limit', () => {
    const errors = validateResources({
      requests: { cpu: '1000m' },
      limits: { cpu: '500m' },
    });
    expect(errors).toContain('CPU request exceeds limit');
  });

  it('detects memory request exceeding limit', () => {
    const errors = validateResources({
      requests: { memory: '1Gi' },
      limits: { memory: '512Mi' },
    });
    expect(errors).toContain('Memory request exceeds limit');
  });
});
