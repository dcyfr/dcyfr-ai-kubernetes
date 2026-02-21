/**
 * Manifest validation utilities
 */

import type { Deployment, Service, ConfigMap, Ingress, HPA } from '../types/index.js';

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

type Container = Deployment['spec']['template']['spec']['containers'][number];

function validateContainer(container: Container, errors: string[], warnings: string[]): void {
  if (!container.name) errors.push('Container must have a name');
  if (!container.image) errors.push('Container must have an image');

  // Resource warnings
  if (!container.resources) {
    warnings.push(`Container '${container.name}' has no resource limits/requests`);
  } else {
    if (!container.resources.limits) {
      warnings.push(`Container '${container.name}' has no resource limits`);
    }
    if (!container.resources.requests) {
      warnings.push(`Container '${container.name}' has no resource requests`);
    }
  }

  // Probe warnings
  if (!container.livenessProbe) {
    warnings.push(`Container '${container.name}' has no liveness probe`);
  }
  if (!container.readinessProbe) {
    warnings.push(`Container '${container.name}' has no readiness probe`);
  }
}

/**
 * Validate a Deployment manifest
 */
export function validateDeployment(deployment: Deployment): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name validation
  if (!deployment.metadata.name) {
    errors.push('Deployment must have a name');
  } else if (deployment.metadata.name.length > 253) {
    errors.push('Deployment name must be <= 253 characters');
  }

  // Replicas
  if (deployment.spec.replicas !== undefined && deployment.spec.replicas < 0) {
    errors.push('Replicas must be >= 0');
  }

  // Containers
  if (deployment.spec.template.spec.containers.length === 0) {
    errors.push('At least one container is required');
  }

  for (const container of deployment.spec.template.spec.containers) {
    validateContainer(container, errors, warnings);
  }

  // Selector must match template labels
  const selectorLabels = deployment.spec.selector.matchLabels;
  const templateLabels = deployment.spec.template.metadata?.labels ?? {};
  for (const [key, value] of Object.entries(selectorLabels)) {
    if (templateLabels[key] !== value) {
      errors.push(
        `Selector label '${key}=${value}' not found in template labels`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a Service manifest
 */
export function validateService(service: Service): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!service.metadata.name) {
    errors.push('Service must have a name');
  }

  if (service.spec.ports.length === 0) {
    errors.push('Service must have at least one port');
  }

  for (const port of service.spec.ports) {
    if (port.port < 1 || port.port > 65535) {
      errors.push(`Port ${port.port} out of valid range (1-65535)`);
    }
    if (service.spec.type === 'NodePort' && port.nodePort) {
      if (port.nodePort < 30000 || port.nodePort > 32767) {
        errors.push(`NodePort ${port.nodePort} out of valid range (30000-32767)`);
      }
    }
  }

  if (!service.spec.selector || Object.keys(service.spec.selector).length === 0) {
    warnings.push('Service has no selector — will match no pods');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a ConfigMap manifest
 */
export function validateConfigMap(configMap: ConfigMap): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!configMap.metadata.name) {
    errors.push('ConfigMap must have a name');
  }

  if (
    (!configMap.data || Object.keys(configMap.data).length === 0) &&
    (!configMap.binaryData || Object.keys(configMap.binaryData).length === 0)
  ) {
    warnings.push('ConfigMap has no data');
  }

  // Check total size (1 MiB limit)
  if (configMap.data) {
    const totalSize = Object.values(configMap.data).reduce(
      (sum, v) => sum + v.length,
      0
    );
    if (totalSize > 1048576) {
      errors.push('ConfigMap data exceeds 1 MiB limit');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an Ingress manifest
 */
export function validateIngress(ingress: Ingress): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ingress.metadata.name) {
    errors.push('Ingress must have a name');
  }

  if (ingress.spec.rules.length === 0) {
    errors.push('Ingress must have at least one rule');
  }

  for (const rule of ingress.spec.rules) {
    if (!rule.host) {
      warnings.push('Ingress rule has no host — will match all hosts');
    }
    if (rule.http.paths.length === 0) {
      errors.push('Ingress rule must have at least one path');
    }
  }

  if (!ingress.spec.ingressClassName) {
    warnings.push('No ingress class specified');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an HPA manifest
 */
export function validateHPA(hpa: HPA): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hpa.metadata.name) {
    errors.push('HPA must have a name');
  }

  if (hpa.spec.minReplicas > hpa.spec.maxReplicas) {
    errors.push('minReplicas cannot exceed maxReplicas');
  }

  if (!hpa.spec.metrics || hpa.spec.metrics.length === 0) {
    warnings.push('HPA has no metrics — autoscaling will have no targets');
  }

  if (!hpa.spec.scaleTargetRef.name) {
    errors.push('HPA must reference a target deployment');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate any K8s resource by kind
 */
export function validateManifest(
  resource: Record<string, unknown>
): ValidationResult {
  const kind = resource.kind as string | undefined;

  switch (kind) {
    case 'Deployment':
      return validateDeployment(resource as unknown as Deployment);
    case 'Service':
      return validateService(resource as unknown as Service);
    case 'ConfigMap':
      return validateConfigMap(resource as unknown as ConfigMap);
    case 'Ingress':
      return validateIngress(resource as unknown as Ingress);
    case 'HorizontalPodAutoscaler':
      return validateHPA(resource as unknown as HPA);
    default:
      return {
        valid: true,
        errors: [],
        warnings: [`Unknown resource kind: ${kind ?? 'undefined'}`],
      };
  }
}
