# StatefulSet 中使用动态 PV

StatefulSet 适合有状态应用，每个 Pod 拥有独立的持久化存储。

## 架构模式

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

## 完整示例

```yaml
# statefulset-web-app.yaml
---
# 1. Headless Service（必需）
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
  serviceName: web-app-service   # 必须指定 Service
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
        - name: data                # 必须与 volumeClaimTemplates 名称一致
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
  # 关键：VolumeClaimTemplates
  volumeClaimTemplates:
  - metadata:
      name: data                    # PVC 名称前缀
    spec:
      storageClassName: curvine-sc
      accessModes:
        - ReadWriteOnce             # 每个 Pod 独立存储
      resources:
        requests:
          storage: 1Gi
```

## 部署和验证

```bash
# 1. 部署 StatefulSet
kubectl apply -f statefulset-web-app.yaml

# 2. 查看 Pod 创建顺序（按序创建）
kubectl get pods -l app=web-app -w

# 3. 查看 PVC（自动创建，每个 Pod 一个）
kubectl get pvc
# 输出示例：
# data-web-app-0   Bound    pvc-xxx   1Gi       RWO
# data-web-app-1   Bound    pvc-yyy   1Gi       RWO
# data-web-app-2   Bound    pvc-zzz   1Gi       RWO

# 4. 查看 PV（自动创建）
kubectl get pv

# 5. 验证每个 Pod 有独立的存储
for i in 0 1 2; do
  echo "=== Pod web-app-$i ==="
  kubectl exec web-app-$i -- cat /usr/share/nginx/html/index.html
done

# 6. 写入自定义数据到 Pod-0
kubectl exec web-app-0 -- sh -c \
  'echo "<p>Custom data from Pod-0</p>" >> /usr/share/nginx/html/index.html'

# 7. 验证 Pod-0 的数据
kubectl exec web-app-0 -- cat /usr/share/nginx/html/index.html

# 8. 验证 Pod-1 没有 Pod-0 的自定义数据（独立存储）
kubectl exec web-app-1 -- cat /usr/share/nginx/html/index.html

# 9. 测试持久化：删除 Pod-0 后数据仍然存在
kubectl delete pod web-app-0
# 等待 Pod 重建
kubectl wait --for=condition=Ready pod/web-app-0 --timeout=60s
# 验证数据依然存在
kubectl exec web-app-0 -- cat /usr/share/nginx/html/index.html
```

## StatefulSet 特性

### PVC 命名规则

```
PVC 名称 = volumeClaimTemplate.name + "-" + StatefulSet.name + "-" + Pod序号

示例：
data-web-app-0
data-web-app-1
data-web-app-2
```

### Pod 和 PVC 生命周期

```bash
# 1. 删除 Pod，PVC 不会被删除
kubectl delete pod web-app-0
# Pod 重建后会自动绑定回原来的 PVC，数据保留

# 2. 删除 StatefulSet，保留 PVC（推荐）
kubectl delete statefulset web-app --cascade=orphan
# PVC 和数据都保留

# 3. 删除 StatefulSet 和 Pod，但保留 PVC
kubectl delete statefulset web-app
# 需要手动删除 PVC

# 4. 手动删除 PVC
kubectl delete pvc data-web-app-0
```

### 扩缩容

```bash
# 1. 扩容（增加副本）
kubectl scale statefulset web-app --replicas=5
# 自动创建 web-app-3, web-app-4 和对应的 PVC

# 2. 缩容（减少副本）
kubectl scale statefulset web-app --replicas=2
# web-app-2 被删除，但 PVC data-web-app-2 保留

# 3. 重新扩容
kubectl scale statefulset web-app --replicas=3
# web-app-2 重建并绑定回 data-web-app-2，数据恢复
```

### FUSE 进程共享

```yaml
# 多个 PV 共享 FUSE 进程的条件：
# 1. 相同的 master-addrs
# 2. 相同的 curvine-path

# 示例：这两个 PV 会共享 FUSE 进程
PV1:
  master-addrs: "10.0.0.1:8995"
  curvine-path: "/shared-data"

PV2:
  master-addrs: "10.0.0.1:8995"
  curvine-path: "/shared-data"

# 这两个 PV 会有独立的 FUSE 进程
PV3:
  curvine-path: "/data-1"

PV4:
  curvine-path: "/data-2"
```