/**
 * Standard Kubernetes labels and annotations
 */

/** Standard K8s recommended labels */
export interface StandardLabels {
  'app.kubernetes.io/name': string;
  'app.kubernetes.io/instance': string;
  'app.kubernetes.io/version'?: string;
  'app.kubernetes.io/component'?: string;
  'app.kubernetes.io/part-of'?: string;
  'app.kubernetes.io/managed-by'?: string;
}

/**
 * Create standard K8s recommended labels
 */
export function standardLabels(
  name: string,
  instance: string,
  options?: {
    version?: string;
    component?: string;
    partOf?: string;
    managedBy?: string;
  }
): Record<string, string> {
  const labels: Record<string, string> = {
    'app.kubernetes.io/name': name,
    'app.kubernetes.io/instance': instance,
  };

  if (options?.version) labels['app.kubernetes.io/version'] = options.version;
  if (options?.component) labels['app.kubernetes.io/component'] = options.component;
  if (options?.partOf) labels['app.kubernetes.io/part-of'] = options.partOf;
  labels['app.kubernetes.io/managed-by'] = options?.managedBy ?? 'dcyfr';

  return labels;
}

/**
 * Create simple app labels
 */
export function appLabels(
  name: string,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    app: name,
    ...extra,
  };
}

/**
 * Create environment labels
 */
export function envLabels(
  name: string,
  environment: 'development' | 'staging' | 'production'
): Record<string, string> {
  return {
    app: name,
    environment,
  };
}

/**
 * Merge multiple label sets
 */
export function mergeLabels(
  ...labelSets: Record<string, string>[]
): Record<string, string> {
  return Object.assign({}, ...labelSets);
}

/**
 * Validate a Kubernetes label key
 *
 * Rules: max 63 chars for name part, 253 for prefix.
 * Must start/end with alphanumeric, can contain -, _, .
 */
export function isValidLabelKey(key: string): boolean {
  const parts = key.split('/');
  if (parts.length > 2) return false;

  const name = parts.length === 2 ? parts[1] : parts[0];
  const prefix = parts.length === 2 ? parts[0] : undefined;

  if (name.length === 0 || name.length > 63) return false;
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(name)) return false;

  if (prefix) {
    if (prefix.length > 253) return false;
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(prefix)) return false;
  }

  return true;
}

/**
 * Validate a Kubernetes label value
 *
 * Max 63 chars, must start/end with alphanumeric (or empty string)
 */
export function isValidLabelValue(value: string): boolean {
  if (value === '') return true;
  if (value.length > 63) return false;
  return /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(value);
}

/**
 * Common annotation keys
 */
export const ANNOTATIONS = {
  /** Description annotation */
  description: 'dcyfr.ai/description',
  /** Team owner */
  team: 'dcyfr.ai/team',
  /** Last deployed timestamp */
  lastDeployed: 'dcyfr.ai/last-deployed',
  /** Git commit SHA */
  gitCommit: 'dcyfr.ai/git-commit',
  /** Prometheus scrape */
  prometheusScrape: 'prometheus.io/scrape',
  prometheusPort: 'prometheus.io/port',
  prometheusPath: 'prometheus.io/path',
} as const;
