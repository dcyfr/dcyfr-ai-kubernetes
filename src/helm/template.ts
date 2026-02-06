/**
 * Helm template rendering — simple {{.Values.x}} interpolation
 */

/**
 * Render a Helm-style template string with values
 *
 * Supports: {{ .Values.key }}, {{ .Release.Name }}, {{ .Chart.Name }}
 */
export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  let result = template;

  // Replace {{ .Values.x }} patterns
  result = result.replace(
    /\{\{\s*\.Values\.(\w+(?:\.\w+)*)\s*\}\}/g,
    (_match, path: string) => {
      const value = getNestedValue(context.values, path);
      return value !== undefined ? String(value) : '';
    }
  );

  // Replace {{ .Release.Name }}
  result = result.replace(
    /\{\{\s*\.Release\.Name\s*\}\}/g,
    context.releaseName ?? 'release'
  );

  // Replace {{ .Chart.Name }}
  result = result.replace(
    /\{\{\s*\.Chart\.Name\s*\}\}/g,
    context.chartName ?? 'chart'
  );

  // Replace {{ .Release.Namespace }}
  result = result.replace(
    /\{\{\s*\.Release\.Namespace\s*\}\}/g,
    context.namespace ?? 'default'
  );

  // Replace {{ .Chart.Version }}
  result = result.replace(
    /\{\{\s*\.Chart\.Version\s*\}\}/g,
    context.chartVersion ?? '0.1.0'
  );

  return result;
}

/** Context for template rendering */
export interface TemplateContext {
  values: Record<string, unknown>;
  releaseName?: string;
  chartName?: string;
  namespace?: string;
  chartVersion?: string;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Create a basic deployment template string for Helm
 */
export function deploymentTemplate(): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-{{ .Chart.Name }}
  namespace: {{ .Release.Namespace }}
  labels:
    app: {{ .Chart.Name }}
    release: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Chart.Name }}
      release: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Chart.Name }}
        release: {{ .Release.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}`;
}

/**
 * Create a basic service template string for Helm
 */
export function serviceTemplate(): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-{{ .Chart.Name }}
  namespace: {{ .Release.Namespace }}
  labels:
    app: {{ .Chart.Name }}
    release: {{ .Release.Name }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
      protocol: TCP
  selector:
    app: {{ .Chart.Name }}
    release: {{ .Release.Name }}`;
}

/**
 * Create an ingress template string for Helm
 */
export function ingressTemplate(): string {
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}-{{ .Chart.Name }}
  namespace: {{ .Release.Namespace }}
  labels:
    app: {{ .Chart.Name }}
    release: {{ .Release.Name }}
spec:
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ .Release.Name }}-{{ .Chart.Name }}
                port:
                  number: {{ .Values.service.port }}`;
}
