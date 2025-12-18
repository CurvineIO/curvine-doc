# Deployment 中使用动态 PV

Deployment 适合无状态应用，多个副本共享同一存储。

## 架构模式

```
           Deployment (3 replicas)
               /      |      \
            Pod-1  Pod-2  Pod-3
               \      |      /
                Single PVC (RWX)
                      |
              Curvine Volume (Shared)
```

## 完整示例

```yaml
# deployment-with-pvc.yaml
---
# 1. 创建共享 PVC
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
# 2. 创建 Deployment
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
          claimName: shared-data-pvc  # 共享同一 PVC

---
# 3. 创建 Service
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
对于Devployment应用，kubernetes原生定位于无状态服务，也就是所有的副本pod默认都读写的是同一个pv的路径。 如果你的应用程序又需要在curvine上有不同的路径隔离， 也可以尝试使用 社区的open kruise的`CloneSets` 作为替代，支持VolumeCliamTemplates， 参考 https://openkruise.io/zh/docs/user-manuals/cloneset
:::

## 部署和验证

```bash
# 1. 部署应用
kubectl apply -f deployment-with-pvc.yaml

# 2. 查看 PVC 状态
kubectl get pvc shared-data-pvc

# 3. 查看所有 Pod
kubectl get pods -l app=web-app -o wide

# 4. 验证所有 Pod 都挂载了同一 PVC
kubectl get pods -l app=web-app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.volumes[0].persistentVolumeClaim.claimName}{"\n"}{end}'

# 5. 在一个 Pod 写入数据
POD1=$(kubectl get pod -l app=web-app -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD1 -- sh -c 'echo "Hello from Pod 1" > /usr/share/nginx/html/test.html'

# 6. 在另一个 Pod 读取数据（验证共享）
POD2=$(kubectl get pod -l app=web-app -o jsonpath='{.items[1].metadata.name}')
kubectl exec $POD2 -- cat /usr/share/nginx/html/test.html
# 应该输出: Hello from Pod 1

# 7. 验证 Service 访问
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- curl http://web-app-service/test.html
```