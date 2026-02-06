/**
 * @dcyfr/ai-kubernetes — Types & Zod Schemas
 *
 * Comprehensive type definitions for Kubernetes resources.
 */

import { z } from 'zod';

// ─── Core K8s Primitives ──────────────────────────────────────────

/** Standard Kubernetes metadata */
export const MetadataSchema = z.object({
  name: z.string().min(1).max(253),
  namespace: z.string().min(1).max(63).optional(),
  labels: z.record(z.string()).optional(),
  annotations: z.record(z.string()).optional(),
});
export type Metadata = z.infer<typeof MetadataSchema>;

/** Container port definition */
export const ContainerPortSchema = z.object({
  name: z.string().optional(),
  containerPort: z.number().int().min(1).max(65535),
  protocol: z.enum(['TCP', 'UDP', 'SCTP']).default('TCP'),
});
export type ContainerPort = z.infer<typeof ContainerPortSchema>;

/** Environment variable */
export const EnvVarSchema = z.object({
  name: z.string().min(1),
  value: z.string().optional(),
  valueFrom: z
    .object({
      configMapKeyRef: z
        .object({ name: z.string(), key: z.string() })
        .optional(),
      secretKeyRef: z
        .object({ name: z.string(), key: z.string() })
        .optional(),
      fieldRef: z.object({ fieldPath: z.string() }).optional(),
    })
    .optional(),
});
export type EnvVar = z.infer<typeof EnvVarSchema>;

/** Resource quantity (CPU / memory) */
export const ResourceQuantitySchema = z.object({
  cpu: z.string().optional(),
  memory: z.string().optional(),
  'ephemeral-storage': z.string().optional(),
});
export type ResourceQuantity = z.infer<typeof ResourceQuantitySchema>;

/** Resource requirements */
export const ResourceRequirementsSchema = z.object({
  requests: ResourceQuantitySchema.optional(),
  limits: ResourceQuantitySchema.optional(),
});
export type ResourceRequirements = z.infer<typeof ResourceRequirementsSchema>;

/** Volume mount */
export const VolumeMountSchema = z.object({
  name: z.string().min(1),
  mountPath: z.string().min(1),
  readOnly: z.boolean().default(false),
  subPath: z.string().optional(),
});
export type VolumeMount = z.infer<typeof VolumeMountSchema>;

/** Volume source */
export const VolumeSchema = z.object({
  name: z.string().min(1),
  configMap: z.object({ name: z.string() }).optional(),
  secret: z.object({ secretName: z.string() }).optional(),
  emptyDir: z.object({ medium: z.string().optional() }).optional(),
  persistentVolumeClaim: z
    .object({ claimName: z.string(), readOnly: z.boolean().optional() })
    .optional(),
});
export type Volume = z.infer<typeof VolumeSchema>;

// ─── Health Probes ────────────────────────────────────────────────

/** HTTP probe action */
export const HttpGetActionSchema = z.object({
  path: z.string().default('/'),
  port: z.number().int().or(z.string()),
  scheme: z.enum(['HTTP', 'HTTPS']).default('HTTP'),
  httpHeaders: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .optional(),
});
export type HttpGetAction = z.infer<typeof HttpGetActionSchema>;

/** TCP socket probe action */
export const TcpSocketActionSchema = z.object({
  port: z.number().int().or(z.string()),
});

/** Exec probe action */
export const ExecActionSchema = z.object({
  command: z.array(z.string()).min(1),
});

/** Probe configuration */
export const ProbeSchema = z.object({
  httpGet: HttpGetActionSchema.optional(),
  tcpSocket: TcpSocketActionSchema.optional(),
  exec: ExecActionSchema.optional(),
  initialDelaySeconds: z.number().int().min(0).default(0),
  periodSeconds: z.number().int().min(1).default(10),
  timeoutSeconds: z.number().int().min(1).default(1),
  successThreshold: z.number().int().min(1).default(1),
  failureThreshold: z.number().int().min(1).default(3),
});
export type Probe = z.infer<typeof ProbeSchema>;

// ─── Container ────────────────────────────────────────────────────

/** Container specification */
export const ContainerSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
  imagePullPolicy: z.enum(['Always', 'IfNotPresent', 'Never']).default('IfNotPresent'),
  command: z.array(z.string()).optional(),
  args: z.array(z.string()).optional(),
  ports: z.array(ContainerPortSchema).optional(),
  env: z.array(EnvVarSchema).optional(),
  resources: ResourceRequirementsSchema.optional(),
  volumeMounts: z.array(VolumeMountSchema).optional(),
  livenessProbe: ProbeSchema.optional(),
  readinessProbe: ProbeSchema.optional(),
  startupProbe: ProbeSchema.optional(),
});
export type Container = z.infer<typeof ContainerSchema>;

// ─── Workload Resources ───────────────────────────────────────────

/** Pod template spec */
export const PodTemplateSpecSchema = z.object({
  metadata: MetadataSchema.partial().optional(),
  spec: z.object({
    containers: z.array(ContainerSchema).min(1),
    initContainers: z.array(ContainerSchema).optional(),
    volumes: z.array(VolumeSchema).optional(),
    restartPolicy: z.enum(['Always', 'OnFailure', 'Never']).default('Always'),
    serviceAccountName: z.string().optional(),
    nodeSelector: z.record(z.string()).optional(),
    tolerations: z
      .array(
        z.object({
          key: z.string().optional(),
          operator: z.enum(['Exists', 'Equal']).optional(),
          value: z.string().optional(),
          effect: z
            .enum(['NoSchedule', 'PreferNoSchedule', 'NoExecute'])
            .optional(),
          tolerationSeconds: z.number().optional(),
        })
      )
      .optional(),
  }),
});
export type PodTemplateSpec = z.infer<typeof PodTemplateSpecSchema>;

/** Deployment spec */
export const DeploymentSchema = z.object({
  apiVersion: z.literal('apps/v1').default('apps/v1'),
  kind: z.literal('Deployment').default('Deployment'),
  metadata: MetadataSchema,
  spec: z.object({
    replicas: z.number().int().min(0).default(1),
    selector: z.object({
      matchLabels: z.record(z.string()),
    }),
    template: PodTemplateSpecSchema,
    strategy: z
      .object({
        type: z.enum(['RollingUpdate', 'Recreate']).default('RollingUpdate'),
        rollingUpdate: z
          .object({
            maxSurge: z.union([z.number(), z.string()]).optional(),
            maxUnavailable: z.union([z.number(), z.string()]).optional(),
          })
          .optional(),
      })
      .optional(),
    revisionHistoryLimit: z.number().int().min(0).default(10),
  }),
});
export type Deployment = z.infer<typeof DeploymentSchema>;

// ─── Service ──────────────────────────────────────────────────────

/** Service port */
export const ServicePortSchema = z.object({
  name: z.string().optional(),
  port: z.number().int().min(1).max(65535),
  targetPort: z.number().int().or(z.string()).optional(),
  protocol: z.enum(['TCP', 'UDP', 'SCTP']).default('TCP'),
  nodePort: z.number().int().min(30000).max(32767).optional(),
});
export type ServicePort = z.infer<typeof ServicePortSchema>;

/** Service spec */
export const ServiceSchema = z.object({
  apiVersion: z.literal('v1').default('v1'),
  kind: z.literal('Service').default('Service'),
  metadata: MetadataSchema,
  spec: z.object({
    type: z
      .enum(['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'])
      .default('ClusterIP'),
    selector: z.record(z.string()),
    ports: z.array(ServicePortSchema).min(1),
    clusterIP: z.string().optional(),
    externalTrafficPolicy: z.enum(['Cluster', 'Local']).optional(),
    sessionAffinity: z.enum(['None', 'ClientIP']).default('None'),
  }),
});
export type Service = z.infer<typeof ServiceSchema>;

// ─── ConfigMap & Secret ───────────────────────────────────────────

/** ConfigMap */
export const ConfigMapSchema = z.object({
  apiVersion: z.literal('v1').default('v1'),
  kind: z.literal('ConfigMap').default('ConfigMap'),
  metadata: MetadataSchema,
  data: z.record(z.string()).optional(),
  binaryData: z.record(z.string()).optional(),
});
export type ConfigMap = z.infer<typeof ConfigMapSchema>;

/** Secret */
export const SecretSchema = z.object({
  apiVersion: z.literal('v1').default('v1'),
  kind: z.literal('Secret').default('Secret'),
  metadata: MetadataSchema,
  type: z
    .enum(['Opaque', 'kubernetes.io/tls', 'kubernetes.io/dockerconfigjson'])
    .default('Opaque'),
  data: z.record(z.string()).optional(),
  stringData: z.record(z.string()).optional(),
});
export type Secret = z.infer<typeof SecretSchema>;

// ─── Ingress ──────────────────────────────────────────────────────

/** Ingress path */
export const IngressPathSchema = z.object({
  path: z.string().default('/'),
  pathType: z.enum(['Prefix', 'Exact', 'ImplementationSpecific']).default('Prefix'),
  backend: z.object({
    service: z.object({
      name: z.string(),
      port: z.object({
        number: z.number().int().optional(),
        name: z.string().optional(),
      }),
    }),
  }),
});
export type IngressPath = z.infer<typeof IngressPathSchema>;

/** Ingress rule */
export const IngressRuleSchema = z.object({
  host: z.string().optional(),
  http: z.object({
    paths: z.array(IngressPathSchema).min(1),
  }),
});
export type IngressRule = z.infer<typeof IngressRuleSchema>;

/** Ingress TLS */
export const IngressTLSSchema = z.object({
  hosts: z.array(z.string()).optional(),
  secretName: z.string().optional(),
});

/** Ingress spec */
export const IngressSchema = z.object({
  apiVersion: z.literal('networking.k8s.io/v1').default('networking.k8s.io/v1'),
  kind: z.literal('Ingress').default('Ingress'),
  metadata: MetadataSchema,
  spec: z.object({
    ingressClassName: z.string().optional(),
    tls: z.array(IngressTLSSchema).optional(),
    rules: z.array(IngressRuleSchema).min(1),
    defaultBackend: z
      .object({
        service: z.object({
          name: z.string(),
          port: z.object({
            number: z.number().int().optional(),
            name: z.string().optional(),
          }),
        }),
      })
      .optional(),
  }),
});
export type Ingress = z.infer<typeof IngressSchema>;

// ─── Namespace ────────────────────────────────────────────────────

/** Namespace */
export const NamespaceSchema = z.object({
  apiVersion: z.literal('v1').default('v1'),
  kind: z.literal('Namespace').default('Namespace'),
  metadata: MetadataSchema,
});
export type Namespace = z.infer<typeof NamespaceSchema>;

// ─── HPA ──────────────────────────────────────────────────────────

/** Horizontal Pod Autoscaler */
export const HPASchema = z.object({
  apiVersion: z
    .literal('autoscaling/v2')
    .default('autoscaling/v2'),
  kind: z
    .literal('HorizontalPodAutoscaler')
    .default('HorizontalPodAutoscaler'),
  metadata: MetadataSchema,
  spec: z.object({
    scaleTargetRef: z.object({
      apiVersion: z.string().default('apps/v1'),
      kind: z.string().default('Deployment'),
      name: z.string(),
    }),
    minReplicas: z.number().int().min(1).default(1),
    maxReplicas: z.number().int().min(1),
    metrics: z
      .array(
        z.object({
          type: z.enum(['Resource', 'Pods', 'Object', 'External']),
          resource: z
            .object({
              name: z.string(),
              target: z.object({
                type: z.enum([
                  'Utilization',
                  'Value',
                  'AverageValue',
                ]),
                averageUtilization: z.number().optional(),
                averageValue: z.string().optional(),
                value: z.string().optional(),
              }),
            })
            .optional(),
        })
      )
      .optional(),
  }),
});
export type HPA = z.infer<typeof HPASchema>;

// ─── Helm Chart Types ─────────────────────────────────────────────

/** Helm Chart.yaml */
export const HelmChartSchema = z.object({
  apiVersion: z.enum(['v1', 'v2']).default('v2'),
  name: z.string().min(1),
  version: z.string().default('0.1.0'),
  appVersion: z.string().default('1.0.0'),
  description: z.string().optional(),
  type: z.enum(['application', 'library']).default('application'),
  keywords: z.array(z.string()).optional(),
  home: z.string().url().optional(),
  sources: z.array(z.string().url()).optional(),
  maintainers: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().email().optional(),
        url: z.string().url().optional(),
      })
    )
    .optional(),
  dependencies: z
    .array(
      z.object({
        name: z.string(),
        version: z.string(),
        repository: z.string().optional(),
        condition: z.string().optional(),
      })
    )
    .optional(),
});
export type HelmChart = z.infer<typeof HelmChartSchema>;

/** Helm values.yaml — flexible key-value */
export const HelmValuesSchema = z.object({
  replicaCount: z.number().int().min(0).default(1),
  image: z.object({
    repository: z.string(),
    tag: z.string().default('latest'),
    pullPolicy: z.enum(['Always', 'IfNotPresent', 'Never']).default('IfNotPresent'),
  }),
  service: z.object({
    type: z
      .enum(['ClusterIP', 'NodePort', 'LoadBalancer'])
      .default('ClusterIP'),
    port: z.number().int().default(80),
  }),
  ingress: z.object({
    enabled: z.boolean().default(false),
    className: z.string().optional(),
    hosts: z
      .array(
        z.object({
          host: z.string(),
          paths: z.array(
            z.object({
              path: z.string().default('/'),
              pathType: z.string().default('Prefix'),
            })
          ),
        })
      )
      .default([]),
    tls: z.array(z.object({ secretName: z.string(), hosts: z.array(z.string()) })).default([]),
  }),
  resources: ResourceRequirementsSchema.optional(),
  autoscaling: z
    .object({
      enabled: z.boolean().default(false),
      minReplicas: z.number().int().default(1),
      maxReplicas: z.number().int().default(10),
      targetCPUUtilizationPercentage: z.number().int().optional(),
      targetMemoryUtilizationPercentage: z.number().int().optional(),
    })
    .optional(),
  nodeSelector: z.record(z.string()).optional(),
  tolerations: z.array(z.unknown()).optional(),
  affinity: z.record(z.unknown()).optional(),
});
export type HelmValues = z.infer<typeof HelmValuesSchema>;

// ─── Manifest Bundle ──────────────────────────────────────────────

/** Any K8s resource */
export type KubernetesResource =
  | Deployment
  | Service
  | ConfigMap
  | Secret
  | Ingress
  | Namespace
  | HPA;

/** Manifest bundle for multi-resource output */
export interface ManifestBundle {
  name: string;
  namespace?: string;
  resources: KubernetesResource[];
  createdAt: number;
}
