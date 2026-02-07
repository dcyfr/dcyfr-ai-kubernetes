# Kubernetes Troubleshooting Guide

**Target Audience:** DevOps engineers, SREs, developers  
**Prerequisites:** kubectl access, basic K8s knowledge

---

## Overview

Common Kubernetes issues and systematic troubleshooting approaches.

---

## Diagnostic Commands Cheat Sheet

```bash
# Cluster health
kubectl cluster-info
kubectl get nodes
kubectl get componentstatuses

# Pod status
kubectl get pods --all-namespaces
kubectl get pods -n production -o wide
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production
kubectl logs <pod-name> -n production --previous # Previous container logs
kubectl logs <pod-name> -n production -c <container-name> # Multi-container pod

# Events
kubectl get events -n production --sort-by='.lastTimestamp'
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -20

# Resource usage
kubectl top nodes
kubectl top pods -n production

# Network debugging
kubectl run debug --image=nicolaka/netshoot --rm -it -- /bin/bash
kubectl exec -it <pod-name> -- /bin/bash

# Configuration
kubectl get configmap -n production
kubectl get secrets -n production
kubectl describe configmap <configmap-name>
```

---

## Pod Issues

### Issue: Pods Stuck in Pending

**Symptoms:**
```bash
$ kubectl get pods
NAME            READY   STATUS    RESTARTS   AGE
api-server-...  0/1     Pending   0          5m
```

**Diagnosis:**
```bash
kubectl describe pod api-server-xxx

# Look for Events section:
# Warning  FailedScheduling  ...  0/3 nodes are available: 3 Insufficient cpu.
```

**Common Causes & Solutions:**

**1. Insufficient Resources**
```
Events: 0/3 nodes available: 3 Insufficient cpu
```

**Solution:** Reduce resource requests or add nodes
```yaml
resources:
  requests:
    cpu: 100m # Reduce from 1000m
    memory: 128Mi
```

**2. Node Selector Mismatch**
```
Events: 0/3 nodes available: 3 node(s) didn't match nodeSelector
```

**Solution:** Fix node selector or label nodes
```bash
# Check node labels
kubectl get nodes --show-labels

# Add label to node
kubectl label node <node-name> disktype=ssd
```

**3. Taints & Tolerations**
```
Events: 0/3 nodes available: 3 node(s) had taints that the pod didn't tolerate
```

**Solution:** Add toleration to pod
```yaml
tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "worker"
    effect: "NoSchedule"
```

**4. Persistent Volume Pending**
```
Events: pod has unbound immediate PersistentVolumeClaims
```

**Solution:** Create PersistentVolume or fix StorageClass
```bash
kubectl get pvc
kubectl describe pvc <pvc-name>
```

### Issue: Pods Crash Looping

**Symptoms:**
```bash
$ kubectl get pods
NAME            READY   STATUS             RESTARTS   AGE
api-server-...  0/1     CrashLoopBackOff   5          3m
```

**Diagnosis:**
```bash
# Check logs
kubectl logs api-server-xxx
kubectl logs api-server-xxx --previous

# Check events
kubectl describe pod api-server-xxx
```

**Common Causes & Solutions:**

**1. Application Error at Startup**
```bash
$ kubectl logs api-server-xxx
Error: Cannot find module 'express'
```

**Solution:** Fix application code or dependencies
```dockerfile
# Ensure dependencies installed in Dockerfile
RUN npm install --production
```

**2. Liveness Probe Failing**
```
Events: Liveness probe failed: HTTP probe failed with statuscode: 500
```

**Solution:** Fix application health endpoint or adjust probe
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30 # Give app more time to start
  periodSeconds: 10
  failureThreshold: 5 # Allow more failures
```

**3. Missing Environment Variables**
```bash
$ kubectl logs api-server-xxx
Error: DATABASE_URL environment variable not set
```

**Solution:** Add to deployment
```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: url
```

**4. OOMKilled (Out of Memory)**
```bash
$ kubectl describe pod api-server-xxx
State:      Terminated
Reason:     OOMKilled
Exit Code:  137
```

**Solution:** Increase memory limits
```yaml
resources:
  requests:
    memory: 512Mi
  limits:
    memory: 1Gi # Increase from 512Mi
```

### Issue: Pods Not Ready

**Symptoms:**
```bash
$ kubectl get pods
NAME            READY   STATUS    RESTARTS   AGE
api-server-...  0/1     Running   0          2m
```

**Diagnosis:**
```bash
kubectl describe pod api-server-xxx

# Check Events:
# Warning  Unhealthy  ...  Readiness probe failed: Get "http://10.0.0.1:8080/ready": dial tcp 10.0.0.1:8080: connect: connection refused
```

**Common Causes & Solutions:**

**1. Readiness Probe Failing**

**Solution:** Fix application or adjust probe
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10 # Wait longer before first check
  periodSeconds: 5
  successThreshold: 2 # Require 2 successful checks
```

**2. Application Still Starting**

**Solution:** Add startup probe
```yaml
startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30 # 30 * 10s = 5 minutes max startup time
  periodSeconds: 10
```

### Issue: ImagePullBackOff

**Symptoms:**
```bash
$ kubectl get pods
NAME            READY   STATUS             RESTARTS   AGE
api-server-...  0/1     ImagePullBackOff   0          1m
```

**Diagnosis:**
```bash
kubectl describe pod api-server-xxx

# Events:
# Warning  Failed  ...  Failed to pull image "myregistry.io/api-server:v1.2.3": rpc error: code = Unknown desc = Error response from daemon: pull access denied
```

**Common Causes & Solutions:**

**1. Image Does Not Exist**

**Solution:** Verify image name and tag
```bash
# Check if image exists
docker pull myregistry.io/api-server:v1.2.3

# List available tags
curl https://myregistry.io/v2/api-server/tags/list
```

**2. Private Registry Authentication**

**Solution:** Create image pull secret
```bash
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.io \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myemail@example.com \
  -n production
```

Add to deployment:
```yaml
spec:
  imagePullSecrets:
    - name: regcred
  containers:
    - name: api-server
      image: myregistry.io/api-server:v1.2.3
```

**3. Rate Limit from Docker Hub**

**Solution:** Use authenticated pulls
```bash
kubectl create secret docker-registry dockerhub-creds \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=your-dockerhub-username \
  --docker-password=your-dockerhub-token
```

---

## Service & Networking Issues

### Issue: Service Not Accessible

**Symptoms:**
```bash
$ curl http://api-server-service
curl: (7) Failed to connect to api-server-service port 80
```

**Diagnosis:**
```bash
# Check service
kubectl get svc api-server-service -n production
kubectl describe svc api-server-service -n production

# Check endpoints (should list pod IPs)
kubectl get endpoints api-server-service -n production
```

**Common Causes & Solutions:**

**1. No Endpoints (Selector Mismatch)**

```bash
$ kubectl get endpoints api-server-service
NAME                ENDPOINTS   AGE
api-server-service  <none>      5m
```

**Cause:** Service selector doesn't match pod labels

**Solution:** Fix selector
```bash
# Check pod labels
kubectl get pods --show-labels

# Update service selector
kubectl edit service api-server-service
# Ensure selector matches pod labels
```

**2. Pods Not Ready**

**Solution:** Fix readiness probes (see Pods Not Ready section)

**3. Port Mismatch**

**Solution:** Verify port configuration
```yaml
# Service
spec:
  ports:
    - port: 80        # Service port (what clients use)
      targetPort: 8080 # Pod port (what app listens on)

# Deployment
spec:
  containers:
    - ports:
        - containerPort: 8080 # Must match targetPort
```

### Issue: DNS Resolution Failing

**Symptoms:**
```bash
$ kubectl exec api-server-xxx -- nslookup db-service
;; connection timed out; no servers could be reached
```

**Diagnosis:**
```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Test DNS from pod
kubectl run debug --image=busybox:1.28 --rm -it --restart=Never -- nslookup kubernetes.default
```

**Common Causes & Solutions:**

**1. CoreDNS Not Running**

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

**Solution:** Restart CoreDNS
```bash
kubectl rollout restart deployment/coredns -n kube-system
```

**2. Network Policy Blocking DNS**

**Solution:** Allow DNS traffic
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

---

## Volume & Storage Issues

### Issue: PersistentVolumeClaim Pending

**Symptoms:**
```bash
$ kubectl get pvc
NAME        STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
postgres-pvc   Pending                                 standard       5m
```

**Diagnosis:**
```bash
kubectl describe pvc postgres-pvc

# Events:
# Warning  ProvisioningFailed  ...  Failed to provision volume: invalid AWS KMS key
```

**Common Causes & Solutions:**

**1. Invalid StorageClass**

**Solution:** Check available StorageClasses
```bash
kubectl get storageclass
kubectl describe storageclass standard
```

**2. No PersistentVolume Available**

**Solution:** Create PV or use dynamic provisioning
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: /mnt/data
```

### Issue: Volume Mount Permission Denied

**Symptoms:**
```bash
$ kubectl logs postgres-xxx
Error: Permission denied: cannot write to /var/lib/postgresql/data
```

**Solution:** Set security context
```yaml
securityContext:
  fsGroup: 999 # Postgres UID
  runAsUser: 999
```

---

## Configuration Issues

### Issue: ConfigMap/Secret Not Found

**Symptoms:**
```bash
Events: Error: couldn't find key DATABASE_URL in Secret default/db-credentials
```

**Diagnosis:**
```bash
kubectl get secret db-credentials -n production
kubectl describe secret db-credentials
```

**Solution:** Verify secret exists and has correct keys
```bash
# Check secret data
kubectl get secret db-credentials -o jsonpath='{.data}'

# Manually create if missing
kubectl create secret generic db-credentials \
  --from-literal=DATABASE_URL=postgresql://... \
  -n production
```

---

## Performance Issues

### Issue: High Memory Usage

**Diagnosis:**
```bash
kubectl top pods -n production
kubectl top nodes
```

**Solution:** Increase memory limits or investigate memory leak
```bash
# Get detailed memory stats
kubectl exec api-server-xxx -- cat /sys/fs/cgroup/memory/memory.stat

# Check for memory leaks in application
kubectl exec api-server-xxx -- ps aux
```

### Issue: High CPU Usage

**Solution:** Scale horizontally or investigate inefficient code
```bash
# Check CPU throttling
kubectl describe pod api-server-xxx | grep -i cpu

# Profile application
kubectl exec api-server-xxx node --prof app.js
```

---

## Debugging Tools

### Ephemeral Debug Container

```bash
# Add debug container to running pod (K8s 1.23+)
kubectl debug api-server-xxx -it --image=busybox --target=api-server
```

### Network Debugging

```bash
# Run netshoot for network troubleshooting
kubectl run netshoot --image=nicolaka/netshoot --rm -it -- /bin/bash

# Inside netshoot:
$ nslookup api-server-service
$ curl http://api-server-service
$ ping 10.0.0.1
$ traceroute api-server-service
$ netstat -tuln
```

### Kubectl Plugins

```bash
# Install kubectl plugins
kubectl krew install debug
kubectl krew install tail
kubectl krew install view-allocations

# Use plugins
kubectl debug api-server-xxx
kubectl tail -n production
kubectl view-allocations
```

---

## Troubleshooting Checklist

- [ ] Check pod status: `kubectl get pods`
- [ ] View pod details: `kubectl describe pod <name>`
- [ ] Check logs: `kubectl logs <name>`
- [ ] Check previous logs: `kubectl logs <name> --previous`
- [ ] Check events: `kubectl get events --sort-by='.lastTimestamp'`
- [ ] Check resource usage: `kubectl top pods`
- [ ] Check service endpoints: `kubectl get endpoints`
- [ ] Test DNS: `kubectl run debug --image=busybox --rm -it -- nslookup kubernetes.default`
- [ ] Check network policies: `kubectl get networkpolicies`
- [ ] Verify ConfigMaps/Secrets exist: `kubectl get configmaps,secrets`
- [ ] Check node health: `kubectl get nodes`
- [ ] Review Cluster Autoscaler logs: `kubectl logs -n kube-system deployment/cluster-autoscaler`

---

**Last Updated:** February 7, 2026  
**Version:** 1.0.0
