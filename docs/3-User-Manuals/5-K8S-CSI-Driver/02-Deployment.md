# Using Dynamic PV in Deployment

Deployment is suitable for stateless applications where multiple replicas share the same storage.

## Architecture Pattern

```
           Deployment (3 replicas)
               /      |      \
            Pod-1  Pod-2  Pod-3
               \      |      /
                Single PVC (RWX)
                      |
              Curvine Volume (Shared)
```

## Complete Example

```yaml
# deployment-with-pvc.yaml
---
# 1. Create shared PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data-pvc
  namespace: default
spec:
  storageClassName: curvine-sc
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi

---
# 2. Create Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
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
        volumeMounts:
        - name: shared-storage
          mountPath: /usr/share/nginx/html
        command:
        - /bin/sh
        - -c
        - |
          if [ ! -f /usr/share/nginx/html/index.html ]; then
            echo "<h1>App initialized by command</h1>" > /usr/share/nginx/html/index.html
          fi
          exec nginx -g 'daemon off;'
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
      volumes:
      - name: shared-storage
        persistentVolumeClaim:
          claimName: shared-data-pvc  # Share the same PVC

---
# 3. Create Service
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
  namespace: default
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

:::tip
For Deployment applications, Kubernetes is natively positioned for stateless services, meaning all replica Pods by default read and write to the same PV path. If your application requires different path isolation on Curvine, you can try using OpenKruise's `CloneSets` as an alternative, which supports VolumeClaimTemplates. Reference: https://openkruise.io/zh/docs/user-manuals/cloneset
:::

## Deploy and Verify

```bash
# 1. Deploy application
kubectl apply -f deployment-with-pvc.yaml

# 2. Check PVC status
kubectl get pvc shared-data-pvc

# 3. Check all Pods
kubectl get pods -l app=web-app -o wide

# 4. Verify all Pods mounted the same PVC
kubectl get pods -l app=web-app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.volumes[0].persistentVolumeClaim.claimName}{"\n"}{end}'

# 5. Write data in one Pod
POD1=$(kubectl get pod -l app=web-app -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD1 -- sh -c 'echo "Hello from Pod 1" > /usr/share/nginx/html/test.html'

# 6. Read data in another Pod (verify sharing)
POD2=$(kubectl get pod -l app=web-app -o jsonpath='{.items[1].metadata.name}')
kubectl exec $POD2 -- cat /usr/share/nginx/html/test.html
# Should output: Hello from Pod 1

# 7. Verify Service access
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- curl http://web-app-service/test.html
```