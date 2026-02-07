# Kubernetes Scaling Guide

**Target Audience:** DevOps engineers, SREs, platform architects  
**Prerequisites:** Running K8s cluster, metrics-server installed

---

## Overview

Kubernetes provides three autoscaling mechanisms:

1. **Horizontal Pod Autoscaler (HPA)** - Scale pods based on CPU/memory/custom metrics
2. **Vertical Pod Autoscaler (VPA)** - Adjust CPU/memory requests and limits
3. **Cluster Autoscaler (CA)** - Add/remove nodes based on pending pods

---

## Horizontal Pod Autoscaler (HPA)

### Prerequisites

Install metrics-server:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify
kubectl get deployment metrics-server -n kube-system
kubectl top nodes
kubectl top pods
```

### CPU-Based Autoscaling

```typescript
import { createHPA, setCPUTarget } from '@dcyfr/ai-kubernetes';

// Create HPA targeting 70% CPU utilization
let hpa = createHPA({
  name: 'api-server-hpa',
  namespace: 'production',
  targetRef: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    name: 'api-server',
  },
  minReplicas: 3,
  maxReplicas: 20,
});

hpa = setCPUTarget(hpa, 70); // Target 70% CPU

console.log(toYAML(hpa));
```

**Resulting YAML:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Apply and verify:
```bash
kubectl apply -f hpa.yaml

# Check HPA status
kubectl get hpa -n production
kubectl describe hpa api-server-hpa -n production
```

### Memory-Based Autoscaling

```typescript
import { createHPA, setMemoryTarget } from '@dcyfr/ai-kubernetes';

let hpa = createHPA({
  name: 'cache-hpa',
  namespace: 'production',
  targetRef: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    name: 'redis-cache',
  },
  minReplicas: 2,
  maxReplicas: 10,
});

hpa = setMemoryTarget(hpa, 80); // Target 80% memory

console.log(toYAML(hpa));
```

### Combined CPU + Memory Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # Scale if either CPU > 70% OR memory > 80%
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Behavior:** HPA scales when ANY metric exceeds threshold (OR condition).

### Custom Metrics with Prometheus

Install Prometheus Adapter:
```bash
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://monitoring-kube-prometheus-prometheus.monitoring.svc
```

Configure custom metric:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa-custom
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 50
  metrics:
    # Scale based on HTTP request rate
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000" # Scale if >1000 req/s per pod

    # Scale based on queue depth
    - type: External
      external:
        metric:
          name: queue_depth
          selector:
            matchLabels:
              queue_name: "api_jobs"
        target:
          type: AverageValue
          averageValue: "100" # Scale if >100 jobs pending
```

### HPA Behavior Configuration

Control scale-up/scale-down aggressiveness:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300 # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60 # Scale down max 50% per minute
        - type: Pods
          value: 2
          periodSeconds: 60 # Scale down max 2 pods per minute
      selectPolicy: Min # Use most conservative policy
    scaleUp:
      stabilizationWindowSeconds: 0 # Scale up immediately
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15 # Double pods every 15 seconds
        - type: Pods
          value: 4
          periodSeconds: 15 # Add max 4 pods every 15 seconds
      selectPolicy: Max # Use most aggressive policy
```

---

## Vertical Pod Autoscaler (VPA)

### Install VPA

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh

# Verify
kubectl get pods -n kube-system | grep vpa
```

### Basic VPA Configuration

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Auto" # Auto, Recreate, Initial, Off
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 2000m
          memory: 4Gi
        controlledResources: ["cpu", "memory"]
```

**Update Modes:**
- **Auto** - VPA updates pods automatically (evicts and recreates)
- **Recreate** - VPA updates pods but requires manual recreation
- **Initial** - VPA only sets resources on pod creation
- **Off** - VPA only provides recommendations (no updates)

### VPA Recommendations Only

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa-recommender
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Off" # Only recommend, don't update
```

View recommendations:
```bash
kubectl describe vpa api-server-vpa-recommender -n production

# Output shows:
# Recommendation:
#   Container Recommendations:
#     Container Name: api-server
#     Lower Bound:
#       Cpu:     200m
#       Memory:  256Mi
#     Target:
#       Cpu:     500m
#       Memory:  512Mi
#     Upper Bound:
#       Cpu:     1000m
#       Memory:  1Gi
```

### HPA + VPA Together

**⚠️ Warning:** Don't use HPA and VPA on same metrics (CPU/memory) simultaneously. This creates conflicting scaling actions.

**Safe Combination:**
- **HPA** scales replicas based on CPU/memory
- **VPA** adjusts CPU/memory limits (updateMode: "Initial" or "Off")

```yaml
# HPA for horizontal scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second # Custom metric, not CPU
        target:
          type: AverageValue
          averageValue: "1000"

---
# VPA for vertical scaling (recommendations only)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Off" # Only recommend, don't auto-update
```

---

## Cluster Autoscaler

### GKE Cluster Autoscaler

```bash
# Enable during cluster creation
gcloud container clusters create production-cluster \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 20 \
  --region us-central1

# Enable on existing cluster
gcloud container clusters update production-cluster \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 20 \
  --region us-central1
```

### AWS EKS Cluster Autoscaler

Install Cluster Autoscaler:
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Configure IAM permissions (replace cluster name)
kubectl -n kube-system annotate deployment.apps/cluster-autoscaler \
  cluster-autoscaler.kubernetes.io/safe-to-evict="false"

kubectl -n kube-system set image deployment.apps/cluster-autoscaler \
  cluster-autoscaler=registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
```

### Self-Hosted Cluster Autoscaler

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
          name: cluster-autoscaler
          command:
            - ./cluster-autoscaler
            - --cloud-provider=aws
            - --namespace=kube-system
            - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/production-cluster
            - --balance-similar-node-groups
            - --skip-nodes-with-system-pods=false
          volumeMounts:
            - name: ssl-certs
              mountPath: /etc/ssl/certs/ca-certificates.crt
              readOnly: true
      volumes:
        - name: ssl-certs
          hostPath:
            path: /etc/ssl/certs/ca-bundle.crt
```

### Prevent Pod Eviction

Annotate pods that should not be evicted:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-pod
  annotations:
    cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
spec:
  containers:
    - name: app
      image: myapp:latest
```

---

## Scaling Best Practices

### Resource Requests & Limits

**Always set resource requests for autoscaling:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
        - name: api-server
          image: myapp:latest
          resources:
            requests:
              cpu: 500m      # Required for HPA CPU-based scaling
              memory: 512Mi  # Required for HPA memory-based scaling
            limits:
              cpu: 1000m
              memory: 1Gi
```

### Pod Disruption Budgets

Protect availability during scaling:
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
  namespace: production
spec:
  minAvailable: 2 # Always keep at least 2 pods running
  selector:
    matchLabels:
      app: api-server
```

Or use percentage:
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
spec:
  maxUnavailable: 25% # Max 25% of pods can be unavailable
  selector:
    matchLabels:
      app: api-server
```

### Scaling Thresholds

**Conservative (production):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  minReplicas: 5
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60 # Lower threshold = more headroom
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600 # Wait 10 min before scaling down
```

**Aggressive (cost-optimized):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  minReplicas: 2
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 85 # Higher threshold = fewer pods
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 120 # Fast scale down
```

---

## Monitoring Autoscaling

### HPA Events

```bash
# View HPA scaling events
kubectl get events -n production --field-selector involvedObject.name=api-server-hpa

# Example output:
# Normal  SuccessfulRescale  5m   horizontal-pod-autoscaler  New size: 8; reason: cpu resource utilization above target
```

### HPA Metrics

```bash
# Current HPA status
kubectl get hpa -n production

# Example output:
# NAME             REFERENCE               TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
# api-server-hpa   Deployment/api-server   75%/70%   3         20        10         2d
```

### Grafana Dashboard for HPA

PromQL queries:
```promql
# Current replica count
kube_deployment_status_replicas{namespace="production", deployment="api-server"}

# Desired replica count from HPA
kube_horizontalpodautoscaler_status_desired_replicas{namespace="production"}

# CPU utilization vs target
100 * sum(rate(container_cpu_usage_seconds_total{namespace="production", pod=~"api-server.*"}[5m])) / sum(kube_pod_container_resource_requests{namespace="production", pod=~"api-server.*", resource="cpu"})
```

---

## Scaling Scenarios

### Scenario 1: Predictable Traffic Patterns

Use scheduled scaling with CronJob:
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-morning
  namespace: production
spec:
  schedule: "0 8 * * 1-5" # 8 AM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - kubectl
                - scale
                - deployment/api-server
                - --replicas=20
                - -n production
          restartPolicy: OnFailure
```

### Scenario 2: Bursty Traffic

Use aggressive scale-up with conservative scale-down:
```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
      - type: Percent
        value: 200 # Triple capacity immediately
        periodSeconds: 15
  scaleDown:
    stabilizationWindowSeconds: 600 # Wait 10 min
    policies:
      - type: Pods
        value: 1 # Remove 1 pod at a time
        periodSeconds: 60
```

### Scenario 3: Queue-Based Workloads

Scale based on queue depth:
```yaml
metrics:
  - type: External
    external:
      metric:
        name: queue_depth
      target:
        type: AverageValue
        averageValue: "50" # 50 jobs per pod
```

---

## Troubleshooting Autoscaling

### HPA Not Scaling

**Check metrics-server:**
```bash
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml
# Status should show "True"
```

**Check resource requests:**
```bash
kubectl describe deployment api-server
# Must have requests.cpu and requests.memory
```

**Check HPA conditions:**
```bash
kubectl describe hpa api-server-hpa

# Look for:
# AbleToScale     True   ReadyForNewScale
# ScalingActive   True   ValidMetricFound
```

### Cluster Autoscaler Not Adding Nodes

**Check pending pods:**
```bash
kubectl get pods --all-namespaces --field-selector=status.phase=Pending
```

**Check Cluster Autoscaler logs:**
```bash
kubectl logs -n kube-system deployment/cluster-autoscaler
```

**Check node group limits:**
```bash
# GKE
gcloud container clusters describe production-cluster --region us-central1 | grep autoscaling -A 5
```

---

## Scaling Checklist

- [ ] **Install metrics-server** for HPA
- [ ] **Set resource requests** on all pods
- [ ] **Create HPA** for stateless workloads
- [ ] **Configure Pod Disruption Budgets** for availability
- [ ] **Test autoscaling** with load tests
- [ ] **Monitor HPA metrics** in Grafana
- [ ] **Enable Cluster Autoscaler** on cloud platforms
- [ ] **Set min/max node counts** appropriately
- [ ] **Use VPA** for right-sizing (recommendations mode)
- [ ] **Configure HPA behavior** for scale-up/scale-down rates
- [ ] **Set up alerts** for scaling events
- [ ] **Document scaling thresholds** for team

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
