# StatefulSet With One PVC Per Pod

The official StatefulSet example is `curvine-csi/examples/statefulset-curvine.yaml` in the Curvine source tree.

Use this pattern when each replica needs its own persistent directory instead of sharing one PVC.

## Example Resources

The example creates:

- `Service/curvine-service`
- `StatefulSet/curvine-statefulset`
- namespace `curvine-system`
- `3` replicas
- `volumeClaimTemplates` entry named `data`
- `storageClassName: curvine-sc`
- per-pod mount path `/usr/share/nginx/html`

## Apply The Example

```bash
kubectl apply -f curvine-csi/examples/statefulset-curvine.yaml
```

## What Happens

- Kubernetes creates one PVC per pod from `volumeClaimTemplates`.
- Each pod writes its hostname, timestamp, and PVC name into `index.html`.
- The CSI controller dynamically provisions a Curvine directory for each PVC.
- The CSI node plugin mounts each PVC into the matching pod.

Because each PVC is distinct, each pod gets independent application data even though all of them use the same CSI driver and `StorageClass`.

## Verify PVC Separation

```bash
kubectl get statefulset -n curvine-system curvine-statefulset
kubectl get pods -n curvine-system -l app=curvine-stateful
kubectl get pvc -n curvine-system
```

Check the rendered content inside each replica:

```bash
for pod in curvine-statefulset-0 curvine-statefulset-1 curvine-statefulset-2; do
  echo "=== $pod ==="
  kubectl exec -n curvine-system "$pod" -- cat /usr/share/nginx/html/index.html
done
```

The output should differ by pod hostname and PVC name.

## Check Persistence

```bash
kubectl exec -n curvine-system curvine-statefulset-0 -- sh -c 'echo retained >> /usr/share/nginx/html/index.html'
kubectl delete pod -n curvine-system curvine-statefulset-0
kubectl wait -n curvine-system --for=condition=Ready pod/curvine-statefulset-0 --timeout=120s
kubectl exec -n curvine-system curvine-statefulset-0 -- grep retained /usr/share/nginx/html/index.html
```

If `retained` is still present after the pod is recreated, the StatefulSet is correctly reusing the original PVC.

## Notes

- The example uses `ReadWriteOnce` in `volumeClaimTemplates`, which matches the common StatefulSet pattern of one writer per replica.
- The dynamically created Curvine directory is still derived from the StorageClass `fs-path` plus the generated PV name, not from the pod ordinal directly.
- FUSE reuse still happens at the node level based on `master-addrs + fs-path`; the pod-level data isolation comes from the subdirectory that each PVC points to.
