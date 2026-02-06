/**
 * Helm Chart.yaml builder
 */

import type { HelmChart } from '../types/index.js';

/** Options for creating a Helm chart */
export interface ChartOptions {
  name: string;
  version?: string;
  appVersion?: string;
  description?: string;
  type?: 'application' | 'library';
  keywords?: string[];
  home?: string;
  sources?: string[];
  maintainers?: Array<{ name: string; email?: string; url?: string }>;
  dependencies?: Array<{
    name: string;
    version: string;
    repository?: string;
    condition?: string;
  }>;
}

/**
 * Create a Helm Chart definition
 */
export function createChart(options: ChartOptions): HelmChart {
  return {
    apiVersion: 'v2',
    name: options.name,
    version: options.version ?? '0.1.0',
    appVersion: options.appVersion ?? '1.0.0',
    description: options.description,
    type: options.type ?? 'application',
    keywords: options.keywords,
    home: options.home,
    sources: options.sources,
    maintainers: options.maintainers,
    dependencies: options.dependencies,
  };
}

/**
 * Add a dependency to a chart
 */
export function addDependency(
  chart: HelmChart,
  name: string,
  version: string,
  repository?: string,
  condition?: string
): HelmChart {
  const deps = chart.dependencies ?? [];
  return {
    ...chart,
    dependencies: [...deps, { name, version, repository, condition }],
  };
}

/**
 * Set chart version
 */
export function setChartVersion(chart: HelmChart, version: string): HelmChart {
  return { ...chart, version };
}

/**
 * Set app version
 */
export function setAppVersion(chart: HelmChart, version: string): HelmChart {
  return { ...chart, appVersion: version };
}

/**
 * Add a maintainer
 */
export function addMaintainer(
  chart: HelmChart,
  name: string,
  email?: string,
  url?: string
): HelmChart {
  const maintainers = chart.maintainers ?? [];
  return {
    ...chart,
    maintainers: [...maintainers, { name, email, url }],
  };
}
