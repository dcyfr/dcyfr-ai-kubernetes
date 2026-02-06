/**
 * Ingress manifest builder
 */

import type { Ingress, IngressRule, Metadata } from '../types/index.js';

/** Options for creating an Ingress */
export interface IngressOptions {
  name: string;
  namespace?: string;
  host: string;
  serviceName: string;
  servicePort: number;
  path?: string;
  pathType?: 'Prefix' | 'Exact' | 'ImplementationSpecific';
  ingressClassName?: string;
  tls?: boolean;
  tlsSecretName?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * Create a Kubernetes Ingress manifest
 */
export function createIngress(options: IngressOptions): Ingress {
  const metadata: Metadata = {
    name: options.name,
    namespace: options.namespace,
    labels: { app: options.name, ...options.labels },
    annotations: options.annotations,
  };

  const rule: IngressRule = {
    host: options.host,
    http: {
      paths: [
        {
          path: options.path ?? '/',
          pathType: options.pathType ?? 'Prefix',
          backend: {
            service: {
              name: options.serviceName,
              port: { number: options.servicePort },
            },
          },
        },
      ],
    },
  };

  const tls = options.tls
    ? [
        {
          hosts: [options.host],
          secretName: options.tlsSecretName ?? `${options.name}-tls`,
        },
      ]
    : undefined;

  return {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata,
    spec: {
      ingressClassName: options.ingressClassName,
      rules: [rule],
      tls,
    },
  };
}

/**
 * Add a rule to an existing Ingress
 */
export function addIngressRule(
  ingress: Ingress,
  host: string,
  serviceName: string,
  servicePort: number,
  path = '/'
): Ingress {
  const rule: IngressRule = {
    host,
    http: {
      paths: [
        {
          path,
          pathType: 'Prefix',
          backend: {
            service: {
              name: serviceName,
              port: { number: servicePort },
            },
          },
        },
      ],
    },
  };

  return {
    ...ingress,
    spec: {
      ...ingress.spec,
      rules: [...ingress.spec.rules, rule],
    },
  };
}

/**
 * Add TLS to an Ingress
 */
export function addIngressTLS(
  ingress: Ingress,
  hosts: string[],
  secretName: string
): Ingress {
  const existing = ingress.spec.tls ?? [];
  return {
    ...ingress,
    spec: {
      ...ingress.spec,
      tls: [...existing, { hosts, secretName }],
    },
  };
}

/**
 * Set ingress class
 */
export function setIngressClass(
  ingress: Ingress,
  className: string
): Ingress {
  return {
    ...ingress,
    spec: { ...ingress.spec, ingressClassName: className },
  };
}
