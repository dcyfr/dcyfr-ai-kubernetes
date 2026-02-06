/**
 * Resource limits and requests management
 */

import type { ResourceRequirements } from '../types/index.js';

/**
 * Create resource requirements with requests and limits
 */
export function createResources(options: {
  cpuRequest?: string;
  cpuLimit?: string;
  memoryRequest?: string;
  memoryLimit?: string;
  ephemeralStorageRequest?: string;
  ephemeralStorageLimit?: string;
}): ResourceRequirements {
  return {
    requests: {
      cpu: options.cpuRequest,
      memory: options.memoryRequest,
      'ephemeral-storage': options.ephemeralStorageRequest,
    },
    limits: {
      cpu: options.cpuLimit,
      memory: options.memoryLimit,
      'ephemeral-storage': options.ephemeralStorageLimit,
    },
  };
}

/**
 * Small resource profile — dev/testing workloads
 */
export function smallResources(): ResourceRequirements {
  return createResources({
    cpuRequest: '50m',
    cpuLimit: '200m',
    memoryRequest: '64Mi',
    memoryLimit: '256Mi',
  });
}

/**
 * Medium resource profile — standard workloads
 */
export function mediumResources(): ResourceRequirements {
  return createResources({
    cpuRequest: '250m',
    cpuLimit: '500m',
    memoryRequest: '256Mi',
    memoryLimit: '512Mi',
  });
}

/**
 * Large resource profile — heavy workloads
 */
export function largeResources(): ResourceRequirements {
  return createResources({
    cpuRequest: '500m',
    cpuLimit: '1000m',
    memoryRequest: '512Mi',
    memoryLimit: '1Gi',
  });
}

/**
 * AI/ML resource profile — GPU-class workloads
 */
export function aiResources(): ResourceRequirements {
  return createResources({
    cpuRequest: '1000m',
    cpuLimit: '4000m',
    memoryRequest: '2Gi',
    memoryLimit: '8Gi',
  });
}

/** Standard resource profiles */
export const RESOURCE_PROFILES = {
  small: smallResources,
  medium: mediumResources,
  large: largeResources,
  ai: aiResources,
} as const;

export type ResourceProfile = keyof typeof RESOURCE_PROFILES;

/**
 * Get resources by profile name
 */
export function getResourceProfile(profile: ResourceProfile): ResourceRequirements {
  return RESOURCE_PROFILES[profile]();
}

/**
 * Parse a CPU string to millicores
 */
export function parseCPU(cpu: string): number {
  if (cpu.endsWith('m')) {
    return parseInt(cpu.slice(0, -1), 10);
  }
  return parseFloat(cpu) * 1000;
}

/**
 * Parse a memory string to bytes
 */
export function parseMemory(memory: string): number {
  const units: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    K: 1000,
    M: 1000 ** 2,
    G: 1000 ** 3,
    T: 1000 ** 4,
  };

  for (const [suffix, multiplier] of Object.entries(units)) {
    if (memory.endsWith(suffix)) {
      return parseFloat(memory.slice(0, -suffix.length)) * multiplier;
    }
  }
  return parseInt(memory, 10);
}

/**
 * Validate that requests don't exceed limits
 */
export function validateResources(resources: ResourceRequirements): string[] {
  const errors: string[] = [];

  if (resources.requests?.cpu && resources.limits?.cpu) {
    if (parseCPU(resources.requests.cpu) > parseCPU(resources.limits.cpu)) {
      errors.push('CPU request exceeds limit');
    }
  }

  if (resources.requests?.memory && resources.limits?.memory) {
    if (
      parseMemory(resources.requests.memory) >
      parseMemory(resources.limits.memory)
    ) {
      errors.push('Memory request exceeds limit');
    }
  }

  return errors;
}
