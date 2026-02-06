/**
 * Health probe builders — liveness, readiness, startup
 */

import type { Probe } from '../types/index.js';

/** Common probe options */
export interface ProbeOptions {
  initialDelaySeconds?: number;
  periodSeconds?: number;
  timeoutSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
}

/**
 * Create an HTTP GET liveness probe
 */
export function httpProbe(
  path: string,
  port: number,
  options?: ProbeOptions
): Probe {
  return {
    httpGet: {
      path,
      port,
      scheme: 'HTTP',
    },
    initialDelaySeconds: options?.initialDelaySeconds ?? 0,
    periodSeconds: options?.periodSeconds ?? 10,
    timeoutSeconds: options?.timeoutSeconds ?? 1,
    successThreshold: options?.successThreshold ?? 1,
    failureThreshold: options?.failureThreshold ?? 3,
  };
}

/**
 * Create an HTTPS GET probe
 */
export function httpsProbe(
  path: string,
  port: number,
  options?: ProbeOptions
): Probe {
  return {
    httpGet: {
      path,
      port,
      scheme: 'HTTPS',
    },
    initialDelaySeconds: options?.initialDelaySeconds ?? 0,
    periodSeconds: options?.periodSeconds ?? 10,
    timeoutSeconds: options?.timeoutSeconds ?? 1,
    successThreshold: options?.successThreshold ?? 1,
    failureThreshold: options?.failureThreshold ?? 3,
  };
}

/**
 * Create a TCP socket probe
 */
export function tcpProbe(port: number, options?: ProbeOptions): Probe {
  return {
    tcpSocket: { port },
    initialDelaySeconds: options?.initialDelaySeconds ?? 0,
    periodSeconds: options?.periodSeconds ?? 10,
    timeoutSeconds: options?.timeoutSeconds ?? 1,
    successThreshold: options?.successThreshold ?? 1,
    failureThreshold: options?.failureThreshold ?? 3,
  };
}

/**
 * Create an exec-based probe
 */
export function execProbe(command: string[], options?: ProbeOptions): Probe {
  return {
    exec: { command },
    initialDelaySeconds: options?.initialDelaySeconds ?? 0,
    periodSeconds: options?.periodSeconds ?? 10,
    timeoutSeconds: options?.timeoutSeconds ?? 1,
    successThreshold: options?.successThreshold ?? 1,
    failureThreshold: options?.failureThreshold ?? 3,
  };
}

/**
 * Standard liveness probe: HTTP /healthz
 */
export function livenessProbe(port: number, path = '/healthz'): Probe {
  return httpProbe(path, port, {
    initialDelaySeconds: 15,
    periodSeconds: 20,
    timeoutSeconds: 3,
    failureThreshold: 3,
  });
}

/**
 * Standard readiness probe: HTTP /readyz
 */
export function readinessProbe(port: number, path = '/readyz'): Probe {
  return httpProbe(path, port, {
    initialDelaySeconds: 5,
    periodSeconds: 10,
    timeoutSeconds: 3,
    failureThreshold: 3,
  });
}

/**
 * Standard startup probe: HTTP /healthz with generous timing
 */
export function startupProbe(port: number, path = '/healthz'): Probe {
  return httpProbe(path, port, {
    initialDelaySeconds: 0,
    periodSeconds: 10,
    timeoutSeconds: 3,
    failureThreshold: 30,
  });
}

/**
 * Create a full probe set (liveness + readiness + startup)
 */
export function standardProbes(
  port: number,
  options?: {
    livenessPath?: string;
    readinessPath?: string;
    startupPath?: string;
  }
): { livenessProbe: Probe; readinessProbe: Probe; startupProbe: Probe } {
  return {
    livenessProbe: livenessProbe(port, options?.livenessPath),
    readinessProbe: readinessProbe(port, options?.readinessPath),
    startupProbe: startupProbe(port, options?.startupPath),
  };
}
