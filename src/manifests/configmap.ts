/**
 * ConfigMap & Secret manifest builders
 */

import type { ConfigMap, Secret, Metadata } from '../types/index.js';

/** Options for creating a ConfigMap */
export interface ConfigMapOptions {
  name: string;
  namespace?: string;
  data?: Record<string, string>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * Create a Kubernetes ConfigMap manifest
 */
export function createConfigMap(options: ConfigMapOptions): ConfigMap {
  const metadata: Metadata = {
    name: options.name,
    namespace: options.namespace,
    labels: { app: options.name, ...options.labels },
    annotations: options.annotations,
  };

  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata,
    data: options.data ?? {},
  };
}

/**
 * Set a key-value pair in a ConfigMap
 */
export function setConfigData(
  configMap: ConfigMap,
  key: string,
  value: string
): ConfigMap {
  return {
    ...configMap,
    data: { ...configMap.data, [key]: value },
  };
}

/**
 * Remove a key from a ConfigMap
 */
export function removeConfigData(
  configMap: ConfigMap,
  key: string
): ConfigMap {
  const data = { ...configMap.data };
  delete data[key];
  return { ...configMap, data };
}

/**
 * Create a ConfigMap from a plain key-value object
 */
export function configMapFromObject(
  name: string,
  obj: Record<string, unknown>,
  namespace?: string
): ConfigMap {
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    data[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return createConfigMap({ name, namespace, data });
}

// ─── Secret ───────────────────────────────────────────────────────

/** Options for creating a Secret */
export interface SecretOptions {
  name: string;
  namespace?: string;
  type?: 'Opaque' | 'kubernetes.io/tls' | 'kubernetes.io/dockerconfigjson';
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * Create a Kubernetes Secret manifest
 */
export function createSecret(options: SecretOptions): Secret {
  const metadata: Metadata = {
    name: options.name,
    namespace: options.namespace,
    labels: { app: options.name, ...options.labels },
    annotations: options.annotations,
  };

  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata,
    type: options.type ?? 'Opaque',
    data: options.data,
    stringData: options.stringData,
  };
}

/**
 * Create a Secret from key-value pairs (uses stringData for plain text)
 */
export function secretFromStrings(
  name: string,
  data: Record<string, string>,
  namespace?: string
): Secret {
  return createSecret({ name, namespace, stringData: data });
}

/**
 * Create a TLS secret
 */
export function tlsSecret(
  name: string,
  cert: string,
  key: string,
  namespace?: string
): Secret {
  return createSecret({
    name,
    namespace,
    type: 'kubernetes.io/tls',
    stringData: { 'tls.crt': cert, 'tls.key': key },
  });
}

/**
 * Set a value in a Secret (stringData)
 */
export function setSecretData(
  secret: Secret,
  key: string,
  value: string
): Secret {
  return {
    ...secret,
    stringData: { ...secret.stringData, [key]: value },
  };
}
