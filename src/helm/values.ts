/**
 * Helm values.yaml builder
 */

import type { HelmValues, ResourceRequirements } from '../types/index.js';

/** Options for creating Helm values */
export interface ValuesOptions {
  replicaCount?: number;
  image: {
    repository: string;
    tag?: string;
    pullPolicy?: 'Always' | 'IfNotPresent' | 'Never';
  };
  servicePort?: number;
  serviceType?: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  ingressEnabled?: boolean;
  ingressHost?: string;
  ingressClassName?: string;
  resources?: ResourceRequirements;
  autoscalingEnabled?: boolean;
  autoscalingMinReplicas?: number;
  autoscalingMaxReplicas?: number;
  autoscalingCPU?: number;
  autoscalingMemory?: number;
  nodeSelector?: Record<string, string>;
}

/**
 * Create Helm values
 */
export function createValues(options: ValuesOptions): HelmValues {
  const hosts = options.ingressHost
    ? [{ host: options.ingressHost, paths: [{ path: '/', pathType: 'Prefix' }] }]
    : [];

  return {
    replicaCount: options.replicaCount ?? 1,
    image: {
      repository: options.image.repository,
      tag: options.image.tag ?? 'latest',
      pullPolicy: options.image.pullPolicy ?? 'IfNotPresent',
    },
    service: {
      type: options.serviceType ?? 'ClusterIP',
      port: options.servicePort ?? 80,
    },
    ingress: {
      enabled: options.ingressEnabled ?? false,
      className: options.ingressClassName,
      hosts,
      tls: [],
    },
    resources: options.resources,
    autoscaling: {
      enabled: options.autoscalingEnabled ?? false,
      minReplicas: options.autoscalingMinReplicas ?? 1,
      maxReplicas: options.autoscalingMaxReplicas ?? 10,
      targetCPUUtilizationPercentage: options.autoscalingCPU,
      targetMemoryUtilizationPercentage: options.autoscalingMemory,
    },
    nodeSelector: options.nodeSelector,
  };
}

/**
 * Set image in values
 */
export function setImage(
  values: HelmValues,
  repository: string,
  tag?: string
): HelmValues {
  return {
    ...values,
    image: {
      ...values.image,
      repository,
      tag: tag ?? values.image.tag,
    },
  };
}

/**
 * Set resource requirements in values
 */
export function setValueResources(
  values: HelmValues,
  resources: ResourceRequirements
): HelmValues {
  return { ...values, resources };
}

/**
 * Enable/disable autoscaling
 */
export function setAutoscaling(
  values: HelmValues,
  enabled: boolean,
  options?: {
    min?: number;
    max?: number;
    cpu?: number;
    memory?: number;
  }
): HelmValues {
  return {
    ...values,
    autoscaling: {
      enabled,
      minReplicas: options?.min ?? values.autoscaling?.minReplicas ?? 1,
      maxReplicas: options?.max ?? values.autoscaling?.maxReplicas ?? 10,
      targetCPUUtilizationPercentage:
        options?.cpu ?? values.autoscaling?.targetCPUUtilizationPercentage,
      targetMemoryUtilizationPercentage:
        options?.memory ?? values.autoscaling?.targetMemoryUtilizationPercentage,
    },
  };
}

/**
 * Enable ingress in values
 */
export function setIngress(
  values: HelmValues,
  host: string,
  className?: string
): HelmValues {
  return {
    ...values,
    ingress: {
      ...values.ingress,
      enabled: true,
      className: className ?? values.ingress.className,
      hosts: [{ host, paths: [{ path: '/', pathType: 'Prefix' }] }],
    },
  };
}

/**
 * Merge partial values into existing values
 */
export function mergeValues(
  base: HelmValues,
  overrides: Partial<HelmValues>
): HelmValues {
  return {
    ...base,
    ...overrides,
    image: { ...base.image, ...overrides.image },
    service: { ...base.service, ...overrides.service },
    ingress: { ...base.ingress, ...overrides.ingress },
    autoscaling: base.autoscaling || overrides.autoscaling
      ? { ...(base.autoscaling ?? {}), ...(overrides.autoscaling ?? {}) } as NonNullable<HelmValues['autoscaling']>
      : undefined,
  };
}
