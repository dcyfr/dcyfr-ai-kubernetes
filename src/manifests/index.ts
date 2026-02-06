/**
 * Manifests module barrel export
 */

export {
  createDeployment,
  setReplicas,
  addContainer,
  setResources,
  setStrategy,
  type DeploymentOptions,
} from './deployment.js';

export {
  createService,
  clusterIPService,
  nodePortService,
  loadBalancerService,
  addServicePort,
  setServiceType,
  type ServiceOptions,
} from './service.js';

export {
  createConfigMap,
  setConfigData,
  removeConfigData,
  configMapFromObject,
  createSecret,
  secretFromStrings,
  tlsSecret,
  setSecretData,
  type ConfigMapOptions,
  type SecretOptions,
} from './configmap.js';

export {
  createIngress,
  addIngressRule,
  addIngressTLS,
  setIngressClass,
  type IngressOptions,
} from './ingress.js';

export {
  createNamespace,
  appNamespace,
  type NamespaceOptions,
} from './namespace.js';

export {
  createHPA,
  setCPUTarget,
  setMemoryTarget,
  setScaleRange,
  type HPAOptions,
} from './hpa.js';
