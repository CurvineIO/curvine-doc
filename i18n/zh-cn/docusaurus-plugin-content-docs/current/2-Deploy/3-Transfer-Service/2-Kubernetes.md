---
sidebar_position: 2
---

# Kubernetes 部署 Transfer

Transfer 与 Master、Worker 独立部署。当前 Curvine Helm Chart 不会创建该服务，因此应
使用单独的清单。下方 SQLite 清单固定为单副本，并使用专用 RWO 卷。

## 前置条件

- 命名空间中已部署 Curvine Master 和 Worker。
- 存在包含 `curvine-cluster.toml` 键的集群配置 ConfigMap。示例使用
  `curvine-cluster-config`，请替换为实际名称。
- 集群存在支持 `ReadWriteOnce` 的默认 `StorageClass`，或者在 PVC 上配置
  `storageClassName`。
- 镜像版本与 Master、Worker 一致。

## SQLite 单副本清单

将下列内容保存为 `transfer-sqlite.yaml`，并替换镜像和命名空间。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: curvine-transfer-overlay
data:
  transfer.toml: |
    [transfer]
    enabled = true
    store_url = "sqlite:///opt/curvine/data/transfer/transfer.db"
    hostname = "0.0.0.0"
    rpc_port = 9010
    web_port = 9011
    endpoints = ["curvine-transfer.curvine.svc.cluster.local:9010"]
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: curvine-transfer-data
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: curvine-transfer
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: curvine-transfer
  template:
    metadata:
      labels:
        app: curvine-transfer
    spec:
      initContainers:
        - name: prepare-config
          image: ghcr.io/curvineio/curvine:<version>
          command: ["/bin/sh", "-ec"]
          args:
            - |
              cp /base/curvine-cluster.toml /work/curvine-cluster.toml
              printf '\n' >> /work/curvine-cluster.toml
              cat /overlay/transfer.toml >> /work/curvine-cluster.toml
          volumeMounts:
            - { name: base-config, mountPath: /base, readOnly: true }
            - { name: transfer-overlay, mountPath: /overlay, readOnly: true }
            - { name: config-work, mountPath: /work }
      containers:
        - name: transfer
          image: ghcr.io/curvineio/curvine:<version>
          command: ["/entrypoint.sh"]
          args: ["transfer", "start"]
          env:
            - { name: CURVINE_HOME, value: /app/curvine }
            - { name: CURVINE_CONF_FILE, value: /app/curvine/conf/curvine-cluster.toml }
            - { name: ORPC_BIND_HOSTNAME, value: 0.0.0.0 }
          ports:
            - { name: rpc, containerPort: 9010 }
            - { name: web, containerPort: 9011 }
          startupProbe:
            httpGet: { path: /readyz, port: web }
            periodSeconds: 5
            failureThreshold: 18
          readinessProbe:
            httpGet: { path: /readyz, port: web }
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet: { path: /healthz, port: web }
            periodSeconds: 10
            failureThreshold: 3
          resources:
            requests: { cpu: "1", memory: 1Gi }
            limits: { cpu: "2", memory: 2Gi }
          volumeMounts:
            - name: config-work
              mountPath: /app/curvine/conf/curvine-cluster.toml
              subPath: curvine-cluster.toml
              readOnly: true
            - { name: transfer-data, mountPath: /opt/curvine/data/transfer }
      volumes:
        - name: base-config
          configMap: { name: curvine-cluster-config }
        - name: transfer-overlay
          configMap: { name: curvine-transfer-overlay }
        - name: config-work
          emptyDir: {}
        - name: transfer-data
          persistentVolumeClaim: { claimName: curvine-transfer-data }
---
apiVersion: v1
kind: Service
metadata:
  name: curvine-transfer
spec:
  selector:
    app: curvine-transfer
  ports:
    - { name: rpc, port: 9010, targetPort: rpc }
    - { name: web, port: 9011, targetPort: web }
```

主容器只能挂载生成后的 `curvine-cluster.toml` 文件。若用 `emptyDir` 覆盖整个
`/app/curvine/conf`，会遮蔽镜像中的 `curvine-env.sh`，导致发行包内置客户端脚本异常。

应用并验证服务：

```bash
kubectl -n curvine apply -f transfer-sqlite.yaml
kubectl -n curvine rollout status deployment/curvine-transfer
kubectl -n curvine get pod,svc,pvc -l app=curvine-transfer
kubectl -n curvine exec deployment/curvine-transfer -- curl --fail http://127.0.0.1:9011/readyz
```

## 配置客户端

集群内客户端使用 Service DNS：

```toml
[transfer]
enabled = true
endpoints = ["curvine-transfer.curvine.svc.cluster.local:9010"]
```

集群外客户端必须使用自身可访问的地址；`.svc.cluster.local` 仅在集群网络内可用。

## MySQL 多副本部署

如需运行多个 Transfer 副本，应通过 Secret 提供共享 MySQL `store_url`，移除 SQLite
PVC，并让所有副本使用同一个 ClusterIP Service。所有副本必须使用同一数据库和兼容的
镜像版本。不要将 SQLite Deployment 扩容到一个以上副本。
