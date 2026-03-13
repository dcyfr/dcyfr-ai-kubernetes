<!-- TLP:CLEAR -->
# Agent Container Job Template

Reusable Kubernetes `Job` manifest template for autonomous agent execution.
This template follows `@dcyfr/ai-kubernetes` conventions: explicit labels, bounded resources,
non-root runtime, and no privilege escalation.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: dcyfr-agent-{{TASK_ID}}
  namespace: dcyfr-agents
  labels:
    app.kubernetes.io/name: dcyfr-agent
    app.kubernetes.io/component: autonomous-execution
    app.kubernetes.io/part-of: dcyfr
    app.kubernetes.io/managed-by: dcyfr
    dcyfr.ai/task-id: "{{TASK_ID}}"
    dcyfr.ai/backend: "kubernetes"
spec:
  ttlSecondsAfterFinished: 86400
  backoffLimit: 0
  template:
    metadata:
      labels:
        app.kubernetes.io/name: dcyfr-agent
        dcyfr.ai/task-id: "{{TASK_ID}}"
    spec:
      restartPolicy: Never
      serviceAccountName: dcyfr-agent-runner
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      containers:
        - name: agent
          image: "{{AGENT_IMAGE}}"
          imagePullPolicy: IfNotPresent
          env:
            - name: AGENT_TASK_ID
              value: "{{TASK_ID}}"
            - name: AGENT_TASK_DESC
              value: "{{TASK_DESCRIPTION}}"
            - name: AGENT_REPO
              value: "{{REPO}}"
            - name: AGENT_CONTRACT_ID
              value: "{{CONTRACT_ID}}"
            - name: AGENT_ISSUE_NUMBER
              value: "{{ISSUE_NUMBER}}"
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: dcyfr-agent-secrets
                  key: github-token
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: false
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "2Gi"
```

## Placeholder Mapping

- `{{TASK_ID}}` → OpenSpec task ID (example: `4.3.2`)
- `{{TASK_DESCRIPTION}}` → human-readable task description
- `{{REPO}}` → target repository (`owner/repo`)
- `{{CONTRACT_ID}}` → delegation contract ID
- `{{ISSUE_NUMBER}}` → source issue number
- `{{AGENT_IMAGE}}` → image tag produced by CI/CD

## Notes

- Use `imagePullPolicy: Always` for immutable per-commit tags in production.
- Keep `backoffLimit: 0` to avoid retries hiding deterministic failures.

## Companion NetworkPolicy Template (Strict Egress)

Apply this policy in the same namespace (`dcyfr-agents`) to enforce default-deny egress for
agent pods with explicit DNS + HTTPS allowance.

> Kubernetes `NetworkPolicy` does not support hostname allowlists natively. Use this baseline
> for transport-level isolation, then apply a CNI-specific FQDN policy (example below) to pin
> egress to `github.com`, `registry.npmjs.org`, and `objects.githubusercontent.com`.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dcyfr-agent-egress
  namespace: dcyfr-agents
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: dcyfr-agent
  policyTypes:
    - Egress
  egress:
    # DNS resolution (CoreDNS in kube-system)
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53

    # HTTPS only (pair with FQDN policy in CNI where supported)
    - ports:
        - protocol: TCP
          port: 443
```

### Optional: Cilium FQDN Policy (Hostname Enforcement)

If your cluster uses Cilium, add this policy to enforce host-level egress restrictions.

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: dcyfr-agent-fqdn-egress
  namespace: dcyfr-agents
spec:
  endpointSelector:
    matchLabels:
      app.kubernetes.io/name: dcyfr-agent
  egress:
    - toFQDNs:
        - matchName: github.com
        - matchName: registry.npmjs.org
        - matchName: objects.githubusercontent.com
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s:k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
            - port: "53"
              protocol: TCP
```
