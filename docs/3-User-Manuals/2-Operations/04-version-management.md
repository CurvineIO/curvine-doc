# Version Management and Compatibility

This chapter describes how Curvine components version themselves and how to
operate a cluster whose components may run different versions. Since 0.4.x
every binary emits structured version metadata, servers advertise a
compatibility contract, and the master evaluates peers with a lenient
`diagnose`-by-default policy.

## Version Schema

All Curvine components use the same version schema:

```
<major>.<minor>.<patch>[-<pre-release>][+<build>]
```

Examples: `0.4.0`, `0.4.0-alpha`, `0.5.0-rc.1+build.1234`

Pre-release versions sort before the corresponding release version, following
SemVer precedence: `0.4.0-alpha < 0.4.0-beta < 0.4.0`.

## Protocol Version

The **protocol version** is a monotonic integer that governs wire-level
compatibility between components. It is **not** the same as the release
version.

| Protocol Version | Curvine Release | Notes |
|---|---|---|
| 1 | 0.4.x | Initial structured protocol version |

A component accepts a peer whose protocol version falls within
`[min_protocol_version, protocol_version]` of the server.

## Viewing Component Versions

Every binary prints its structured version as JSON with `--version-json`:

```bash
cv --version-json
curvine-master --version-json
curvine-worker --version-json
curvine-fuse --version-json
```

Example output:

```json
{
  "component": "worker",
  "release_version": "0.4.0-alpha",
  "git_commit": "24c848719b5b4fea74519d91cbe462bb49761b36",
  "git_tag": "v0.4.0-alpha",
  "git_branch": "main",
  "protocol_version": 1,
  "min_protocol_version": 1,
  "capabilities": ["transfer", "batch-write"]
}
```

The fields are:

- `component` — component name (`master`, `worker`, `client`, `fuse`, `cli`, `csi`).
- `release_version` — Cargo/package version of the build.
- `git_commit` / `git_tag` / `git_branch` — exact source provenance.
- `protocol_version` / `min_protocol_version` — wire protocol bounds.
- `capabilities` — feature-level negotiation tokens.

## Worker Version Statistics

The CLI can summarize the release-version distribution across all live
workers. This is the fastest way to see whether a cluster is running a
homogeneous set of versions or a mix of old and new workers:

```bash
cv node --versions
```

Example output:

```text
Version Distribution:
----------------------------------------
  0.4.0-alpha              : 3 worker(s)
  0.4.0-beta               : 5 worker(s)
  legacy (0.3.0-test)      : 1 worker(s)
----------------------------------------
  total                    : 9 worker(s)
```

Workers that report structured `component_info` count under their
`release_version`; older workers that only report the legacy
`software_version` string are counted as `legacy (<version>)`. Workers with no
usable version data at all are grouped under `legacy (no version)`.

## Compatibility Between Components

The master evaluates every worker heartbeat and client handshake against its
own compatibility contract. The default behavior is **lenient**: without
explicit configuration the master records a warning and allows the request, so
old components are never rejected just because they predate the structured
version protocol.

### Master ↔ Worker

| Master | Worker | Protocol | Default Behavior |
|---|---|---|---|
| 0.4.x | 0.4.x | 1 | ✅ Compatible |
| 0.4.x | 0.3.x (legacy, no `component_info`) | n/a | ⚠️ Warning in `diagnose`; rejected only in `enforce` |
| 0.4.x | < `min_worker_version` | n/a | ⚠️ Warning in `diagnose`; rejected only in `enforce` |

### Master ↔ Client (including FUSE / CLI / CSI)

| Master | Client | Protocol | Default Behavior |
|---|---|---|---|
| 0.4.x | 0.4.x | 1 | ✅ Compatible |
| 0.4.x | 0.3.x (legacy) | n/a | ⚠️ Warning in `diagnose`; rejected only in `enforce` |

### Worker ↔ Client (data plane)

| Worker | Client | Protocol | Default Behavior |
|---|---|---|---|
| 0.4.x | 0.4.x | 1 | ✅ Compatible |
| 0.4.x | 0.3.x (legacy) | n/a | ⚠️ Warning in `diagnose`; rejected only in `enforce` |

## Enforcement Policy

The compatibility policy is configured in the master configuration file:

```toml
[master.compatibility]
# "diagnose" (default): warn on incompatibility, allow the request.
# "enforce": reject incompatible requests with an explicit error.
mode = "diagnose"

# Minimum worker release version (empty = not enforced).
min_worker_version = "0.2.0"

# Minimum client release version (empty = not enforced).
min_client_version = "0.1.5"

# Release versions explicitly rejected regardless of mode (emergency backstop).
blocked_versions = ["0.2.5"]
```

- **`mode = "diagnose"` (default):** incompatible peers are allowed, and the
  master logs a warning describing the peer, its version, and the expected
  bound. This is the safe default and never breaks an existing mixed-version
  cluster.
- **`mode = "enforce"`:** incompatible peers are rejected with an explicit
  error that includes the actual peer version and the upgrade suggestion.
- **`blocked_versions`:** release versions listed here are **always rejected**
  regardless of the mode. This is an emergency backstop for known-bad builds
  (see the known-incompatible list on the release notes page).

## Capabilities

Beyond versions, features are negotiated through capability tokens that each
component advertises in its `ComponentVersion`. A feature is enabled only when
**both** peers declare it, so a capability introduced in a newer release is
silently disabled until the whole data path upgrades.

| Capability | Description | Introduced In |
|---|---|---|
| `transfer` | Data transfer between workers | 0.4.0 |
| `batch-write` | Batch write optimization | 0.4.0 |
| `short-circuit` | Short-circuit read (client → worker direct) | 0.4.0 |

## Observability

The master exposes compatibility metrics on the Prometheus endpoint
(`http://<master>:9000/metrics`). See the [Monitoring Metrics](03-monitoring.md)
page for the full metric table.

| Metric | Type | Labels | Description |
|---|---|---|---|
| `compat_worker_verdict` | Gauge | `worker_id`, `verdict` | 1 for the current compatibility verdict of each worker |
| `compat_client_verdict` | Gauge | `client_addr`, `verdict` | 1 for the current compatibility verdict of each client |
| `compat_enforce_rejected_total` | Counter | `component`, `verdict` | Total number of enforce-mode compatibility rejections |

`verdict` takes one of: `compatible`, `missing_info`, `blocked`,
`protocol_mismatch`, `version_too_old`, `version_unknown`.

## Release Notes and Known Incompatibilities

Each release ships release notes that repeat the compatibility table for that
specific version. The known-incompatible list and the release notes template
are maintained in the release notes page; keep the compatibility table there
in sync whenever a version is added to `blocked_versions` or a new protocol
version is introduced.