---
sidebar_position: 4
description: Configure follower metadata reads, roll out worker report mirroring, and verify fallback behavior.
---

# Follower Metadata Reads

Follower metadata reads let clients send eligible metadata queries to a caught-up follower Master, reducing read traffic on the leader. File data still comes from Workers, and metadata writes stay on the leader. The feature is disabled by default.

Use builds containing [Curvine #1854](https://github.com/CurvineIO/curvine/pull/1854) on Masters, Workers, and clients. Start with an existing multi-Master Raft deployment; see [Deployment Setup](../../2-Deploy/2-Deploy-Curvine-Cluster/1-Preparation/03-deployment-setup.md) for cluster membership and per-node addresses.

:::warning
Follower reads are **not linearizable**. Even with `follower_read_max_commit_lag = 0`, freshness is checked against the latest leader commit proof received by that follower, rather than the leader's exact commit at response time. Keep client follower reads disabled for workloads that require every read to observe the latest committed write.
:::

## Configuration Example

The following is the target configuration for a three-Master cluster. Replace `master-1`, `master-2`, and `master-3` with resolvable hostnames. Merge these settings into the corresponding sections of your existing `conf/curvine-cluster.toml`; keep each node's hostname, storage paths, and other deployment settings.

```toml
[journal]
journal_addrs = [
  { id = 1, hostname = "master-1", port = 8996 },
  { id = 2, hostname = "master-2", port = 8996 },
  { id = 3, hostname = "master-3", port = 8996 },
]

[master]
follower_reads_enabled = true
follower_worker_state_enabled = true
follower_read_max_commit_lag = 0
follower_read_apply_stall_timeout = "30s"

[worker]
follower_reports_enabled = true

[client]
master_addrs = [
  { hostname = "master-1", port = 8995 },
  { hostname = "master-2", port = 8995 },
  { hostname = "master-3", port = 8995 },
]
follower_reads_enabled = true
follower_write_sticky_ms = 5000
```

Apply the Master settings on every Master, Worker settings on every Worker, and client settings in each CLI, SDK, or FUSE client's effective configuration. The `8996` addresses are Raft ports; `8995` addresses are Master client RPC ports. Follow the rollout order below instead of enabling all roles simultaneously.

### Master Parameters

These keys belong in `[master]`.

| Parameter | Default | Meaning and allowed values |
| --- | --- | --- |
| `follower_reads_enabled` | `false` | Admit eligible follower metadata reads when freshness checks pass. |
| `follower_worker_state_enabled` | `false` | Maintain passive worker and replica state on followers. Needed together with Worker mirroring for reads that return block locations. |
| `follower_read_max_commit_lag` | `0` | Maximum unapplied entry lag behind the greater of the local Raft commit and the latest proven leader commit. Range: `0`–`10000`. A nonzero value deliberately permits older metadata. |
| `follower_read_apply_stall_timeout` | `"30s"` | Refuse reads when metadata apply or local replication stops making progress. The two stalls are tracked separately. Range: `"1ms"`–`"10m"`. |

A follower must also have completed metadata replay and have recent, accepted contact with the current-term leader. A leader request without the leader commit proof makes follower reads unavailable until a later accepted request supplies it. During a mixed-version upgrade, an older leader can therefore cause clients to fall back to the leader.

### Client Parameters

These keys belong in `[client]`.

| Parameter | Default | Meaning and allowed values |
| --- | --- | --- |
| `follower_reads_enabled` | `false` | Try one eligible follower before using the leader for supported reads. |
| `follower_write_sticky_ms` | `5000` | Keep reads related to recent mutations on the leader within the same client context. Must be greater than `0` when follower reads are enabled. |

The sticky interval starts when the mutation RPC finishes, including failed or cancelled RPCs; related reads also stay on the leader while the mutation is in flight. It covers the mutated path, descendants, and ancestor listings. This is a finite hint shared by clients using the same context, not a cross-client read-after-write guarantee.

### Worker Parameters

These keys belong in `[worker]`. Queue and retry limits are validated when `follower_reports_enabled = true`.

| Parameter | Default | Meaning and allowed values |
| --- | --- | --- |
| `follower_reports_enabled` | `false` | Mirror Worker lifecycle heartbeats and block reports to follower Masters. |
| `follower_report_queue_max_ops` | `256` | Maximum queued block-report operations per follower. Range: `1`–`4096`. |
| `follower_report_queue_max_bytes` | `67108864` (64 MiB) | Shared byte budget per Worker for follower queues and the full-resync inventory. Range: `1`–`1073741824` (1 GiB). |
| `follower_report_max_peer_queues` | `32` | Maximum follower peer queues per Worker. Range: `1`–`32`. Size this to cover the follower Masters that need replica state. |
| `follower_report_max_concurrency` | `16` | Maximum concurrent follower RPCs per Worker. Range: `1`–`32`; each individual peer's requests remain ordered. |
| `follower_report_retry_timeout_ms` | `30000` | Total retry budget for a queued follower request. Range: `1`–`300000` ms. |
| `follower_report_retry_min_ms` | `100` | Initial retry delay. Must be positive and no greater than the retry timeout or maximum retry delay. |
| `follower_report_retry_max_ms` | `5000` | Maximum retry delay, also used to back off resync attempts. Must be at least the minimum delay and at most `60000` ms. |

Queue overflow, omitted peers, or failed sends require full-report resynchronization. A follower with incomplete Worker state refuses location-dependent reads, allowing the client to use the leader.

The byte budget must fit the Worker's full block inventory plus queued messages and per-peer overhead. For example, at 48 bytes per block entry, 64 MiB holds roughly 1.4 million entries **before overhead**; actual capacity depends on the build. If the inventory does not fit, the follower remains unready and clients keep falling back. Increase the budget based on the Worker's inventory size, up to the configured limit. Inventory collection runs outside the heartbeat task, and failed resync attempts back off.

## Rollout Order

1. Upgrade Masters, Workers, and clients to builds containing the feature. Leave the follower-read switches off during the upgrade.
2. Enable `master.follower_reads_enabled` and `master.follower_worker_state_enabled` on every Master and restart them using your deployment's normal rolling procedure. Start with a commit-lag allowance of `0`.
3. Enable `worker.follower_reports_enabled` and restart Workers. Wait for their Start heartbeats and completed full block reports to reach each candidate follower. Keep client follower reads disabled during this step.
4. Enable `client.follower_reads_enabled` in the application, CLI, or FUSE configuration and restart those clients. Monitor accepted and refused follower reads before expanding the rollout.

Worker mirroring is necessary for block-location queries and read-only file opens. Metadata-only operations such as status and directory listing can use caught-up followers without complete replica state. Across elections, followers invalidate their passive readiness and require fresh reports before serving location-dependent reads again.

## Usage Examples

No special filesystem command is required after enabling the feature. Save the client settings in `conf/curvine-follower.toml`, retaining the rest of your normal configuration. For an existing, replicated Curvine-native file at `/datasets/example.txt`:

```bash
cv --conf conf/curvine-follower.toml fs stat /datasets/example.txt
cv --conf conf/curvine-follower.toml fs ls /datasets --cache-only
cv --conf conf/curvine-follower.toml fs cat /datasets/example.txt
```

Status and listing operations are eligible for follower routing. Reading the file may obtain metadata and block locations from a ready follower; file bytes are read from Workers. `--cache-only` restricts the listing to Curvine's cached namespace instead of also consulting a mounted UFS.

Writes use the leader even with the same client configuration:

```bash
cv --conf conf/curvine-follower.toml fs mkdir -p /follower-demo
```

Each CLI invocation creates its own client context. Separate CLI commands do not share the sticky interval, so do not use an immediate write-then-read sequence across commands as proof of read-after-write consistency. The client selects a follower automatically; successful command output alone does not prove that a follower served it. Use the metrics below to verify routing.

## Supported Reads and Fallback

| Operation | Routing |
| --- | --- |
| `Exists`, `FileStatus`, `ListStatus`, `ListOptions`, `GetMountTable`, `GetMountInfo` | Eligible for a follower when freshness checks pass. Glob listings stay on the leader. |
| `GetBlockLocations`, valid read-only `OpenFile` | Also require ready, live Worker locations for every block returned. |
| Writes, write-capable file opens, trash operations, unsupported or malformed requests | Leader only. |

The client attempts at most one follower. Connection and request time together are capped at the smaller of one second and half the remaining `client.rpc_timeout_ms` deadline. A retryable refusal or transport failure triggers one fallback through the leader route, using the remaining deadline. Failed peers enter a five-second cooldown shared by client clones. Terminal errors, such as file-not-found or permission errors, are returned directly rather than retried on the leader.

## Verify and Troubleshoot

Scrape each follower's metrics endpoint. For the default standalone Master metrics port (`9010`):

```bash
curl -fsS http://master-2:9010/metrics \
  | grep -E 'master_follower_read_(accepted|refused)_total'
```

Use the effective `master.web_port` from your configuration if it differs. See [Monitoring](../2-Operations/03-monitoring.md) for metrics collection.

- `master_follower_read_accepted_total{rpc_code=...}` counts served follower reads. Compare samples before and after the eligible read commands.
- `master_follower_read_refused_total{rpc_code=...,reason=...}` counts refusals at a Master. It does not count client-side decisions that skip a follower.

| Refusal reason | What to check |
| --- | --- |
| `replay_not_ready`, `commit_lag` | Metadata replay and Raft replication progress. Keep lag at `0` unless older metadata is acceptable. |
| `no_current_term_contact`, `stale_leader_contact`, `leader_commit_unknown` | Master connectivity, election state, and whether the leader supports commit proofs. |
| `apply_stalled`, `replication_stalled` | Metadata apply or replication is not advancing; inspect Master logs and storage/network health. |
| `block_locations_not_ready` | Worker mirroring, current Worker sessions, completed full reports, queue limits, and resync inventory budget. |

A healthy fallback still returns a successful application result, so verify the accepted counters rather than relying only on command success.

## Disable Follower Reads

Set `client.follower_reads_enabled = false` and restart clients first to restore leader routing. Then disable Worker mirroring and the two Master switches if they are no longer needed, applying each configuration through your normal restart procedure.
