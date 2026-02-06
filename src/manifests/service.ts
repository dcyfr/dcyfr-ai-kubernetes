/**
 * Service manifest builder
 */

import type { Service, Metadata, ServicePort } from '../types/index.js';

/** Options for creating a Service */
export interface ServiceOptions {
  name: string;
  namespace?: string;
  port: number;
  targetPort?: number | string;
  type?: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  selector?: Record<string, string>;
  protocol?: 'TCP' | 'UDP' | 'SCTP';
  nodePort?: number;
  sessionAffinity?: 'None' | 'ClientIP';
}

/**
 * Create a Kubernetes Service manifest
 */
export function createService(options: ServiceOptions): Service {
  const metadata: Metadata = {
    name: options.name,
    namespace: options.namespace,
    labels: { app: options.name, ...options.labels },
    annotations: options.annotations,
  };

  const port: ServicePort = {
    port: options.port,
    targetPort: options.targetPort ?? options.port,
    protocol: options.protocol ?? 'TCP',
    nodePort: options.nodePort,
  };

  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata,
    spec: {
      type: options.type ?? 'ClusterIP',
      selector: options.selector ?? { app: options.name },
      ports: [port],
      sessionAffinity: options.sessionAffinity ?? 'None',
    },
  };
}

/**
 * Create a ClusterIP service (internal only)
 */
export function clusterIPService(
  name: string,
  port: number,
  targetPort?: number
): Service {
  return createService({ name, port, targetPort, type: 'ClusterIP' });
}

/**
 * Create a NodePort service (accessible via node IP)
 */
export function nodePortService(
  name: string,
  port: number,
  nodePort?: number
): Service {
  return createService({ name, port, type: 'NodePort', nodePort });
}

/**
 * Create a LoadBalancer service (cloud LB)
 */
export function loadBalancerService(
  name: string,
  port: number,
  targetPort?: number
): Service {
  return createService({ name, port, targetPort, type: 'LoadBalancer' });
}

/**
 * Add a port to a service
 */
export function addServicePort(
  service: Service,
  port: ServicePort
): Service {
  return {
    ...service,
    spec: {
      ...service.spec,
      ports: [...service.spec.ports, port],
    },
  };
}

/**
 * Set service type
 */
export function setServiceType(
  service: Service,
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
): Service {
  return {
    ...service,
    spec: { ...service.spec, type },
  };
}
