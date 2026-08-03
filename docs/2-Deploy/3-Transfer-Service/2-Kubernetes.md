---
sidebar_position: 2
---

# Deploy Transfer on Kubernetes

Deploy Transfer separately from the Master and Worker workloads. The current
Curvine Helm chart does not create this service, so use a dedicated manifest.
The SQLite manifest below is intentionally a single replica with a dedicated
RWO volume.

## Prerequisites

- An existing Curvine Master and Worker deployment in the namespace.
- A ConfigMap containing the existing `curvine-cluster.toml` with the key name
  shown below. Replace `curvine-cluster-config` if your deployment uses a
  different name.
- A default `StorageClass` that supports `ReadWriteOnce` volumes, or a
  `storageClassName` added to the PVC.
- An image version that matches the Master and Worker version.

## SQLite Single-Replica Manifest

Save this as `transfer-sqlite.yaml`. Replace the image and namespace to match
your cluster.

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

Mount only the generated `curvine-cluster.toml` file into the main container.
Mounting an `emptyDir` over the whole `/app/curvine/conf` directory hides the
image's `curvine-env.sh` and breaks bundled client scripts.

Apply and verify the service:

```bash
kubectl -n curvine apply -f transfer-sqlite.yaml
kubectl -n curvine rollout status deployment/curvine-transfer
kubectl -n curvine get pod,svc,pvc -l app=curvine-transfer
kubectl -n curvine exec deployment/curvine-transfer -- curl --fail http://127.0.0.1:9011/readyz
```

## Configure Clients

For clients inside the Kubernetes cluster, use the Service DNS name:

```toml
[transfer]
enabled = true
endpoints = ["curvine-transfer.curvine.svc.cluster.local:9010"]
```

For a client outside the cluster, publish an address that it can reach. A
`.svc.cluster.local` address is only valid from the cluster network.

## MySQL Multi-Replica Deployment

To run more than one Transfer replica, use a shared MySQL `store_url` supplied
through a Secret, remove the SQLite PVC, and expose all replicas through the
same ClusterIP Service. All replicas must use the same database and compatible
image version. Do not scale the SQLite Deployment above one replica.
