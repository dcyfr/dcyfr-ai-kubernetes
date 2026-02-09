# Kubernetes Security Guide

**Target Audience:** DevOps engineers, SREs, security teams  
**Prerequisites:** K8s cluster admin access

---

## Overview

Production Kubernetes security requires defense-in-depth across:
1. **RBAC** - Role-Based Access Control
2. **Network Policies** - Pod-to-pod traffic restrictions
3. **Pod Security** - SecurityContext, PodSecurityStandards
4. **Secrets Management** - Encryption and secure storage
5. **Image Security** - Registry scanning, admission control

---

## Role-Based Access Control (RBAC)

### ServiceAccounts

Create dedicated ServiceAccounts for applications:
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-server-sa
  namespace: production
```

### Roles & RoleBindings

**Role (namespace-scoped):**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
```

**RoleBinding:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
  - kind: ServiceAccount
    name: api-server-sa
    namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### ClusterRoles & ClusterRoleBindings

**ClusterRole (cluster-wide):**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list"]
```

**ClusterRoleBinding:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-nodes-global
subjects:
  - kind: Group
    name: system:authenticated
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: node-reader
  apiGroup: rbac.authorization.k8s.io
```

### Common RBAC Patterns

**Read-Only Access:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: production
rules:
  - apiGroups: ["", "apps", "batch"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
```

**Admin Access (Namespace):**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: admin-binding
  namespace: production
subjects:
  - kind: User
    name: admin@example.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: admin # Built-in ClusterRole
  apiGroup: rbac.authorization.k8s.io
```

### Auditing RBAC

```bash
# List all ServiceAccounts
kubectl get serviceaccounts --all-namespaces

# Check permissions for ServiceAccount
kubectl auth can-i --list --as=system:serviceaccount:production:api-server-sa -n production

# Test specific permission
kubectl auth can-i delete pods --as=system:serviceaccount:production:api-server-sa -n production
```

---

## Network Policies

### Default Deny All Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

### Allow Specific Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-server
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
    - Ingress
  ingress:
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
```

### Allow Database Access

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-db-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    # Only allow from api-server pods
    - from:
        - podSelector:
            matchLabels:
              app: api-server
      ports:
        - protocol: TCP
          port: 5432
```

### Default Deny All Egress

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

### Allow DNS + Specific Egress

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-and-external-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
    - Egress
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
    
    # Allow external API (e.g., Stripe)
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443
```

### Testing Network Policies

```bash
# Run test pod
kubectl run test --image=busybox --rm -it -- /bin/sh

# Inside pod, test connectivity
$ wget -O- http://api-server-service:8080
# Should succeed if allowed by policy

$ wget -O- http://postgres-service:5432
# Should fail if blocked by policy
```

---

## Pod Security

### SecurityContext (Pod-Level)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
          add:
            - NET_BIND_SERVICE
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}
```

### PodSecurityStandards (K8s 1.23+)

**Namespace-level enforcement:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**PodSecurity levels:**
- **privileged** - Unrestricted (default)
- **baseline** - Minimally restrictive, prevents known privilege escalations
- **restricted** - Heavily restricted, follows current pod hardening best practices

### AppArmor & SELinux

**AppArmor:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-pod
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: runtime/default
spec:
  containers:
    - name: app
      image: myapp:latest
```

**SELinux:**
```yaml
securityContext:
  seLinuxOptions:
    level: "s0:c123,c456"
```

---

## Secrets Management

### Creating Secrets

```bash
# From literal values
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=supersecret \
  -n production

# From files
kubectl create secret generic tls-certs \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem \
  -n production

# Docker registry credentials
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.io \
  --docker-username=user \
  --docker-password=pass \
  -n production
```

### Using Secrets in Pods

**Environment Variables:**
```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: url
```

**Volume Mounts:**
```yaml
volumes:
  - name: secret-volume
    secret:
      secretName: db-credentials
volumeMounts:
  - name: secret-volume
    mountPath: /etc/secrets
    readOnly: true
```

### Encrypting Secrets at Rest

**Create EncryptionConfiguration:**
```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

**Enable encryption (kube-apiserver flag):**
```bash
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

### External Secrets Management

**HashiCorp Vault:**
```bash
# Install Vault Secrets Operator
helm install vault-secrets-operator hashicorp/vault-secrets-operator \
  --namespace vault \
  --create-namespace
```

**AWS Secrets Manager:**
```bash
# Install External Secrets Operator
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace
```

**ExternalSecret Example:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: db-credentials
  data:
    - secretKey: password
      remoteRef:
        key: prod/db/password
```

---

## Image Security

### Image Scanning

**Trivy (vulnerability scanner):**
```bash
# Install Trivy
brew install aquasecurity/trivy/trivy

# Scan image
trivy image myregistry.io/api-server:v1.2.3

# Scan for HIGH and CRITICAL only
trivy image --severity HIGH,CRITICAL myregistry.io/api-server:v1.2.3
```

**In CI/CD:**
```yaml
# GitHub Actions
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'myregistry.io/api-server:v1.2.3'
    severity: 'CRITICAL,HIGH'
    exit-code: '1' # Fail build if vulnerabilities found
```

### Admission Controllers

**OPA Gatekeeper (Policy Enforcement):**
```bash
# Install Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
```

**Policy: Require Non-Root Containers:**
```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequirenonroot
spec:
  crd:
    spec:
      names:
        kind: K8sRequireNonRoot
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequirenonroot
        
        violation[{"msg": msg}] {
          c := input.review.object.spec.containers[_]
          not c.securityContext.runAsNonRoot
          msg := sprintf("Container %v must run as non-root", [c.name])
        }
```

**Constraint:**
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireNonRoot
metadata:
  name: must-run-as-non-root
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters: {}
```

**Policy: Disallow Privileged Containers:**
```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sdisallowprivileged
spec:
  crd:
    spec:
      names:
        kind: K8sDisallowPrivileged
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sdisallowprivileged
        
        violation[{"msg": msg}] {
          c := input.review.object.spec.containers[_]
          c.securityContext.privileged
          msg := sprintf("Privileged containers not allowed: %v", [c.name])
        }
```

### Image Verification

**Sigstore/Cosign:**
```bash
# Sign image
cosign sign --key cosign.key myregistry.io/api-server:v1.2.3

# Verify image
cosign verify --key cosign.pub myregistry.io/api-server:v1.2.3
```

**Policy Controller (Sigstore):**
```bash
# Install Policy Controller
kubectl apply -f https://github.com/sigstore/policy-controller/releases/latest/download/release.yaml
```

**Require Signed Images:**
```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: require-signed-images
spec:
  images:
    - glob: "myregistry.io/**"
  authorities:
    - keyless:
        url: https://fulcio.sigstore.dev
```

---

## Cluster Hardening

### API Server Security

**Enable audit logging:**
```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
    omitStages:
      - RequestReceived
```

**kube-apiserver flags:**
```bash
--audit-policy-file=/etc/kubernetes/audit-policy.yaml
--audit-log-path=/var/log/kubernetes/audit.log
--audit-log-maxage=30
--audit-log-maxbackup=10
--audit-log-maxsize=100
```

### etcd Encryption

```bash
# Generate encryption key
head -c 32 /dev/urandom | base64

# Add to EncryptionConfiguration (shown earlier)
# Restart kube-apiserver
```

### Disable Anonymous Auth

```bash
# kube-apiserver flag
--anonymous-auth=false
```

### Certificate Rotation

```bash
# kubelet flag
--rotate-certificates=true
--rotate-server-certificates=true
```

---

## Security Scanning Tools

### Kubescape (RBAC & Security Compliance)

```bash
# Install
brew install kubescape

# Scan cluster
kubescape scan framework nsa

# Scan specific namespace
kubescape scan framework nsa --namespace production

# Generate report
kubescape scan framework nsa --format json > report.json
```

### kube-bench (CIS Benchmark)

```bash
# Run as Job
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# View results
kubectl logs job/kube-bench
```

### Falco (Runtime Security)

```bash
# Install Falco
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace

# View alerts
kubectl logs -n falco -l app=falco --tail=100
```

---

## Security Checklist

- [ ] **Enable RBAC** for all user access
- [ ] **Create ServiceAccounts** for each application
- [ ] **Apply Network Policies** (default deny + specific allow)
- [ ] **Enforce Pod Security Standards** (restricted level)
- [ ] **Run containers as non-root** (uid > 1000)
- [ ] **Drop all capabilities** except required ones
- [ ] **Use read-only root filesystem** where possible
- [ ] **Encrypt Secrets at rest** (EncryptionConfiguration)
- [ ] **Use external secrets manager** (Vault, AWS Secrets Manager)
- [ ] **Scan images** for vulnerabilities (Trivy, Clair)
- [ ] **Sign and verify images** (Cosign, Sigstore)
- [ ] **Enable admission controllers** (PodSecurityPolicy, OPA Gatekeeper)
- [ ] **Enable audit logging** on API server
- [ ] **Rotate certificates** automatically
- [ ] **Restrict API server access** (disable anonymous auth)
- [ ] **Scan cluster** for compliance (kube-bench, Kubescape)
- [ ] **Monitor runtime** for threats (Falco)

---

## Compliance Frameworks

| Framework | Tool | Description |
|-----------|------|-------------|
| **CIS Kubernetes Benchmark** | kube-bench | Industry best practices |
| **NSA/CISA Guidelines** | Kubescape | Government hardening standards |
| **PCI DSS** | Kubescape | Payment card security |
| **HIPAA** | Manual audit | Healthcare data security |
| **SOC 2** | Custom policies | SaaS security controls |

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
