/**
 * HPA (Horizontal Pod Autoscaler) builder
 */

import type { HPA, Metadata } from '../types/index.js';

/** Options for creating an HPA */
export interface HPAOptions {
  name: string;
  namespace?: string;
  targetDeployment: string;
  minReplicas?: number;
  maxReplicas: number;
  cpuUtilization?: number;
  memoryUtilization?: number;
  labels?: Record<string, string>;
}

/**
 * Create a Horizontal Pod Autoscaler manifest
 */
export function createHPA(options: HPAOptions): HPA {
  const metadata: Metadata = {
    name: options.name,
    namespace: options.namespace,
    labels: { app: options.name, ...options.labels },
  };

  const metrics: HPA['spec']['metrics'] = [];

  if (options.cpuUtilization !== undefined) {
    metrics.push({
      type: 'Resource',
      resource: {
        name: 'cpu',
        target: {
          type: 'Utilization',
          averageUtilization: options.cpuUtilization,
        },
      },
    });
  }

  if (options.memoryUtilization !== undefined) {
    metrics.push({
      type: 'Resource',
      resource: {
        name: 'memory',
        target: {
          type: 'Utilization',
          averageUtilization: options.memoryUtilization,
        },
      },
    });
  }

  return {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata,
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: options.targetDeployment,
      },
      minReplicas: options.minReplicas ?? 1,
      maxReplicas: options.maxReplicas,
      metrics: metrics.length > 0 ? metrics : undefined,
    },
  };
}

/**
 * Set CPU utilization target
 */
export function setCPUTarget(hpa: HPA, percentage: number): HPA {
  const cpuMetric = {
    type: 'Resource' as const,
    resource: {
      name: 'cpu',
      target: {
        type: 'Utilization' as const,
        averageUtilization: percentage,
      },
    },
  };

  const metrics = (hpa.spec.metrics ?? []).filter(
    (m) => !(m.type === 'Resource' && m.resource?.name === 'cpu')
  );
  metrics.push(cpuMetric);

  return {
    ...hpa,
    spec: { ...hpa.spec, metrics },
  };
}

/**
 * Set memory utilization target
 */
export function setMemoryTarget(hpa: HPA, percentage: number): HPA {
  const memMetric = {
    type: 'Resource' as const,
    resource: {
      name: 'memory',
      target: {
        type: 'Utilization' as const,
        averageUtilization: percentage,
      },
    },
  };

  const metrics = (hpa.spec.metrics ?? []).filter(
    (m) => !(m.type === 'Resource' && m.resource?.name === 'memory')
  );
  metrics.push(memMetric);

  return {
    ...hpa,
    spec: { ...hpa.spec, metrics },
  };
}

/**
 * Set min/max replicas
 */
export function setScaleRange(
  hpa: HPA,
  min: number,
  max: number
): HPA {
  return {
    ...hpa,
    spec: {
      ...hpa.spec,
      minReplicas: min,
      maxReplicas: max,
    },
  };
}
