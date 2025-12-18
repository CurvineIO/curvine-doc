# Using Dynamic PV in StatefulSet

StatefulSet is suitable for stateful applications, where each Pod has independent persistent storage.

## Architecture Pattern

```
        StatefulSet (3 replicas)
            |         |         |
         Pod-0     Pod-1     Pod-2
            |         |         |
         PVC-0     PVC-1     PVC-2
            |         |         |
          PV-0      PV-1      PV-2
            |         |         |
     /path/pvc-0  /path/pvc-1  /path/pvc-2
```

## Complete Example

```yaml
# statefulset-web-app.yaml
---
# 1. Headless Service (required)
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
  namespace: default
spec:
  clusterIP: None                # Headless Service
  selector:
    app: web-app
  ports:
  - port: 80
    name: web

---
# 2. StatefulSet with VolumeClaimTemplates
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web-app
  namespace: default
spec:
  serviceName: web-app-service   # Must specify Service
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: data                # Must match volumeClaimTemplates name
          mountPath: /usr/share/nginx/html
        command:
        - /bin/sh
        - -c
        - |
          # Write hello world message with pod name
          echo "<h1>Hello from $(hostname)</h1>" > /usr/share/nginx/html/index.html
          echo "<p>This is my persistent storage!</p>" >> /usr/share/nginx/html/index.html
          echo "<p>Created at: $(date)</p>" >> /usr/share/nginx/html/index.html
          # Start nginx
          nginx -g 'daemon off;'
  # Key: VolumeClaimTemplates
  volumeClaimTemplates:
  - metadata:
      name: data                    # PVC name prefix
    spec:
      storageClassName: curvine-sc
      accessModes:
        - ReadWriteOnce             # Independent storage for each Pod
      resources:
        requests:
          storage: 1Gi
```

## Deploy and Verify

```bash
# 1. Deploy StatefulSet
kubectl apply -f statefulset-web-app.yaml

# 2. Watch Pod creation order (created sequentially)
kubectl get pods -l app=web-app -w

# 3. Check PVCs (auto-created, one per Pod)
kubectl get pvc
# Example output:
# data-web-app-0   Bound    pvc-xxx   1Gi       RWO
# data-web-app-1   Bound    pvc-yyy   1Gi       RWO
# data-web-app-2   Bound    pvc-zzz   1Gi       RWO

# 4. Check PVs (auto-created)
kubectl get pv

# 5. Verify each Pod has independent storage
for i in 0 1 2; do
  echo "=== Pod web-app-$i ==="
  kubectl exec web-app-$i -- cat /usr/share/nginx/html/index.html
done

# 6. Write custom data to Pod-0
kubectl exec web-app-0 -- sh -c \
  'echo "<p>Custom data from Pod-0</p>" >> /usr/share/nginx/html/index.html'

# 7. Verify Pod-0's data
kubectl exec web-app-0 -- cat /usr/share/nginx/html/index.html

# 8. Verify Pod-1 doesn't have Pod-0's custom data (independent storage)
kubectl exec web-app-1 -- cat /usr/share/nginx/html/index.html

# 9. Test persistence: Data remains after deleting Pod-0
kubectl delete pod web-app-0
# Wait for Pod to be recreated
kubectl wait --for=condition=Ready pod/web-app-0 --timeout=60s
# Verify data still exists
kubectl exec web-app-0 -- cat /usr/share/nginx/html/index.html
```

## StatefulSet Features

### PVC Naming Convention

```
PVC name = volumeClaimTemplate.name + "-" + StatefulSet.name + "-" + Pod ordinal

Example:
data-web-app-0
data-web-app-1
data-web-app-2
```

### Pod and PVC Lifecycle

```bash
# 1. Delete Pod, PVC is not deleted
kubectl delete pod web-app-0
# Pod is recreated and automatically binds back to the original PVC, data is retained

# 2. Delete StatefulSet, retain PVCs (recommended)
kubectl delete statefulset web-app --cascade=orphan
# PVCs and data are retained

# 3. Delete StatefulSet and Pods, but retain PVCs
kubectl delete statefulset web-app
# PVCs need manual deletion

# 4. Manually delete PVC
kubectl delete pvc data-web-app-0
```

### Scaling

```bash
# 1. Scale up (increase replicas)
kubectl scale statefulset web-app --replicas=5
# Automatically creates web-app-3, web-app-4 and corresponding PVCs

# 2. Scale down (decrease replicas)
kubectl scale statefulset web-app --replicas=2
# web-app-2 is deleted, but PVC data-web-app-2 is retained

# 3. Scale up again
kubectl scale statefulset web-app --replicas=3
# web-app-2 is recreated and binds back to data-web-app-2, data is restored
```

### FUSE Process Sharing

```yaml
# Conditions for multiple PVs to share a FUSE process:
# 1. Same master-addrs
# 2. Same curvine-path

# Example: These two PVs will share a FUSE process
PV1:
  master-addrs: "10.0.0.1:8995"
  curvine-path: "/shared-data"

PV2:
  master-addrs: "10.0.0.1:8995"
  curvine-path: "/shared-data"

# These two PVs will have independent FUSE processes
PV3:
  curvine-path: "/data-1"

PV4:
  curvine-path: "/data-2"
```