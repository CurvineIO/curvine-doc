# 在 StatefulSet 中为每个 Pod 分配独立 PVC

官方 StatefulSet 示例位于 Curvine 源码树中的 `curvine-csi/examples/statefulset-curvine.yaml`。

当每个副本都需要自己的持久化目录，而不是共享一个 PVC 时，应使用这种模式。

## 示例资源

这个示例会创建：

- `Service/curvine-service`
- `StatefulSet/curvine-statefulset`
- 命名空间 `curvine-system`
- `3` 个副本
- 名为 `data` 的 `volumeClaimTemplates`
- `storageClassName: curvine-sc`
- 容器内挂载路径 `/usr/share/nginx/html`

## 应用示例

```bash
kubectl apply -f curvine-csi/examples/statefulset-curvine.yaml
```

## 实际行为

- Kubernetes 会根据 `volumeClaimTemplates` 为每个 Pod 自动创建一个 PVC。
- 每个 Pod 会把自己的主机名、时间戳和 PVC 名称写入 `index.html`。
- CSI Controller 会为每个 PVC 动态创建对应的 Curvine 目录。
- CSI Node Plugin 再把对应目录挂载到对应的 Pod 中。

因此，虽然这些副本共用同一个 CSI 驱动和同一个 `StorageClass`，但应用层看到的是彼此独立的数据目录。

## 校验 PVC 隔离

```bash
kubectl get statefulset -n curvine-system curvine-statefulset
kubectl get pods -n curvine-system -l app=curvine-stateful
kubectl get pvc -n curvine-system
```

查看每个副本写出的内容：

```bash
for pod in curvine-statefulset-0 curvine-statefulset-1 curvine-statefulset-2; do
  echo "=== $pod ==="
  kubectl exec -n curvine-system "$pod" -- cat /usr/share/nginx/html/index.html
done
```

输出里应该能看到不同的主机名和 PVC 名称。

## 校验持久性

```bash
kubectl exec -n curvine-system curvine-statefulset-0 -- sh -c 'echo retained >> /usr/share/nginx/html/index.html'
kubectl delete pod -n curvine-system curvine-statefulset-0
kubectl wait -n curvine-system --for=condition=Ready pod/curvine-statefulset-0 --timeout=120s
kubectl exec -n curvine-system curvine-statefulset-0 -- grep retained /usr/share/nginx/html/index.html
```

如果 Pod 重建后仍能看到 `retained`，说明 StatefulSet 已正确复用原来的 PVC。

## 说明

- 示例中的 `volumeClaimTemplates` 使用 `ReadWriteOnce`，这符合 StatefulSet 常见的一副本一写者模式。
- 动态创建的 Curvine 目录仍然是由 StorageClass 的 `fs-path` 加 PV 名称组合出来的，而不是直接用 Pod 序号命名。
- FUSE 复用仍然发生在节点层面，键是 `master-addrs + fs-path`；Pod 间数据隔离来自各自 PVC 指向的不同子目录。
