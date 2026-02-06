/**
 * @dcyfr/ai-kubernetes — Kubernetes Deployment Template
 *
 * Generate, validate, and manage K8s manifests and Helm charts.
 *
 * @packageDocumentation
 */

// ─── Types ────────────────────────────────────────────────────────
export type {
  Metadata,
  Container,
  ContainerPort,
  EnvVar,
  ResourceQuantity,
  ResourceRequirements,
  VolumeMount,
  Volume,
  Probe,
  HttpGetAction,
  PodTemplateSpec,
  Deployment,
  Service,
  ServicePort,
  ConfigMap,
  Secret,
  Ingress,
  IngressRule,
  IngressPath,
  Namespace,
  HPA,
  HelmChart,
  HelmValues,
  KubernetesResource,
  ManifestBundle,
} from './types/index.js';

export {
  MetadataSchema,
  ContainerSchema,
  ContainerPortSchema,
  EnvVarSchema,
  ResourceQuantitySchema,
  ResourceRequirementsSchema,
  VolumeMountSchema,
  VolumeSchema,
  ProbeSchema,
  HttpGetActionSchema,
  TcpSocketActionSchema,
  ExecActionSchema,
  PodTemplateSpecSchema,
  DeploymentSchema,
  ServiceSchema,
  ServicePortSchema,
  ConfigMapSchema,
  SecretSchema,
  IngressSchema,
  IngressPathSchema,
  IngressRuleSchema,
  IngressTLSSchema,
  NamespaceSchema,
  HPASchema,
  HelmChartSchema,
  HelmValuesSchema,
} from './types/index.js';

// ─── Manifests ────────────────────────────────────────────────────
export {
  createDeployment,
  setReplicas,
  addContainer,
  setResources,
  setStrategy,
  createService,
  clusterIPService,
  nodePortService,
  loadBalancerService,
  addServicePort,
  setServiceType,
  createConfigMap,
  setConfigData,
  removeConfigData,
  configMapFromObject,
  createSecret,
  secretFromStrings,
  tlsSecret,
  setSecretData,
  createIngress,
  addIngressRule,
  addIngressTLS,
  setIngressClass,
  createNamespace,
  appNamespace,
  createHPA,
  setCPUTarget,
  setMemoryTarget,
  setScaleRange,
} from './manifests/index.js';

export type {
  DeploymentOptions,
  ServiceOptions,
  ConfigMapOptions,
  SecretOptions,
  IngressOptions,
  NamespaceOptions,
  HPAOptions,
} from './manifests/index.js';

// ─── Helm ─────────────────────────────────────────────────────────
export {
  createChart,
  addDependency,
  setChartVersion,
  setAppVersion,
  addMaintainer,
  createValues,
  setImage,
  setValueResources,
  setAutoscaling,
  setIngress,
  mergeValues,
  renderTemplate,
  deploymentTemplate,
  serviceTemplate,
  ingressTemplate,
} from './helm/index.js';

export type {
  ChartOptions,
  ValuesOptions,
  TemplateContext,
} from './helm/index.js';

// ─── Health ───────────────────────────────────────────────────────
export {
  httpProbe,
  httpsProbe,
  tcpProbe,
  execProbe,
  livenessProbe,
  readinessProbe,
  startupProbe,
  standardProbes,
  createResources,
  smallResources,
  mediumResources,
  largeResources,
  aiResources,
  getResourceProfile,
  parseCPU,
  parseMemory,
  validateResources,
  RESOURCE_PROFILES,
} from './health/index.js';

export type { ProbeOptions, ResourceProfile } from './health/index.js';

// ─── Utils ────────────────────────────────────────────────────────
export {
  toYAML,
  toMultiDocYAML,
  validateDeployment,
  validateService,
  validateConfigMap,
  validateIngress,
  validateHPA,
  validateManifest,
  standardLabels,
  appLabels,
  envLabels,
  mergeLabels,
  isValidLabelKey,
  isValidLabelValue,
  ANNOTATIONS,
} from './utils/index.js';

export type { ValidationResult, StandardLabels } from './utils/index.js';
