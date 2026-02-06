/**
 * Namespace manifest builder
 */

import type { Namespace, Metadata } from '../types/index.js';

/** Options for creating a Namespace */
export interface NamespaceOptions {
  name: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * Create a Kubernetes Namespace manifest
 */
export function createNamespace(options: NamespaceOptions): Namespace {
  const metadata: Metadata = {
    name: options.name,
    labels: options.labels,
    annotations: options.annotations,
  };

  return {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata,
  };
}

/**
 * Create a namespace with standard labels
 */
export function appNamespace(name: string, team?: string): Namespace {
  return createNamespace({
    name,
    labels: {
      'app.kubernetes.io/managed-by': 'dcyfr',
      ...(team ? { team } : {}),
    },
  });
}
