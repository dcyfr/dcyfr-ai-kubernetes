/**
 * Deployment manifest builder
 */

import type { Deployment, Container, Metadata, Probe, ResourceRequirements } from '../types/index.js';

/** Options for creating a deployment */
export interface DeploymentOptions {
  name: string;
  namespace?: string;
  image: string;
  replicas?: number;
  port?: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  env?: Array<{ name: string; value: string }>;
  resources?: ResourceRequirements;
  livenessProbe?: Probe;
  readinessProbe?: Probe;
  startupProbe?: Probe;
  command?: string[];
  args?: string[];
  imagePullPolicy?: 'Always' | 'IfNotPresent' | 'Never';
  strategy?: 'RollingUpdate' | 'Recreate';
  revisionHistoryLimit?: number;
  serviceAccountName?: string;
  nodeSelector?: Record<string, string>;
}

/**
 * Create a Kubernetes Deployment manifest
 */
export function createDeployment(options: DeploymentOptions): Deployment {
  const appLabels = {
    app: options.name,
    ...options.labels,
  };

  const container: Container = {
    name: options.name,
    image: options.image,
    imagePullPolicy: options.imagePullPolicy ?? 'IfNotPresent',
    ports: options.port
      ? [{ containerPort: options.port, protocol: 'TCP' as const }]
      : undefined,
    env: options.env,
    resources: options.resources,
    livenessProbe: options.livenessProbe,
    readinessProbe: options.readinessProbe,
    startupProbe: options.startupProbe,
    command: options.command,
    args: options.args,
  };

  const metadata: Metadata = {
    name: options.name,
    namespace: options.namespace,
    labels: appLabels,
    annotations: options.annotations,
  };

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata,
    spec: {
      replicas: options.replicas ?? 1,
      selector: { matchLabels: { app: options.name } },
      template: {
        metadata: { labels: appLabels },
        spec: {
          containers: [container],
          restartPolicy: 'Always',
          serviceAccountName: options.serviceAccountName,
          nodeSelector: options.nodeSelector,
        },
      },
      strategy: options.strategy
        ? { type: options.strategy }
        : { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' } },
      revisionHistoryLimit: options.revisionHistoryLimit ?? 10,
    },
  };
}

/**
 * Set replicas on a deployment
 */
export function setReplicas(deployment: Deployment, replicas: number): Deployment {
  return {
    ...deployment,
    spec: { ...deployment.spec, replicas },
  };
}

/**
 * Add a container to a deployment
 */
export function addContainer(deployment: Deployment, container: Container): Deployment {
  return {
    ...deployment,
    spec: {
      ...deployment.spec,
      template: {
        ...deployment.spec.template,
        spec: {
          ...deployment.spec.template.spec,
          containers: [...deployment.spec.template.spec.containers, container],
        },
      },
    },
  };
}

/**
 * Set resource requirements on the primary container
 */
export function setResources(
  deployment: Deployment,
  resources: ResourceRequirements
): Deployment {
  const containers = [...deployment.spec.template.spec.containers];
  containers[0] = { ...containers[0], resources };
  return {
    ...deployment,
    spec: {
      ...deployment.spec,
      template: {
        ...deployment.spec.template,
        spec: {
          ...deployment.spec.template.spec,
          containers,
        },
      },
    },
  };
}

/**
 * Set deployment strategy
 */
export function setStrategy(
  deployment: Deployment,
  strategy: 'RollingUpdate' | 'Recreate',
  options?: { maxSurge?: string | number; maxUnavailable?: string | number }
): Deployment {
  return {
    ...deployment,
    spec: {
      ...deployment.spec,
      strategy:
        strategy === 'Recreate'
          ? { type: 'Recreate' }
          : {
              type: 'RollingUpdate',
              rollingUpdate: {
                maxSurge: options?.maxSurge ?? '25%',
                maxUnavailable: options?.maxUnavailable ?? '25%',
              },
            },
    },
  };
}
