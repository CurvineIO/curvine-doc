# Release Notes and Known Incompatible Versions

This page compiles the release notes template used for each Curvine release and
the list of release versions known to be incompatible with other Curvine
components. Keep this page in sync whenever a version is added to
`master.compatibility.blocked_versions` or a new protocol version is
introduced.

## Release Notes Template

Copy the template below, fill in the version and date, and ship it with the
release announcement. The **Compatibility** table must match the
[Compatibility Matrix](04-version-management.md) for that version.

```markdown
## Curvine v<VERSION> — <RELEASE_DATE>

### Highlights

_Brief description of the most important changes in this release (2-3 sentences)._

### Upgrade Notes

- **Compatibility:** Review the Compatibility Matrix before upgrading. The
  default mode is `diagnose` (lenient), so old components are not rejected
  without explicit configuration.
- **Breaking changes:** _List any breaking changes, config migration steps, or
  deprecations here._
- **Minimum versions:** _List updated minimum version requirements here._

### New Features

- _Feature 1: short description. ([#NNN](https://github.com/CurvineIO/curvine/pull/NNN))_
- _Feature 2: short description. ([#NNN](https://github.com/CurvineIO/curvine/pull/NNN))_

### Bug Fixes

- _Bug fix 1: short description. ([#NNN](https://github.com/CurvineIO/curvine/pull/NNN))_
- _Bug fix 2: short description. ([#NNN](https://github.com/CurvineIO/curvine/pull/NNN))_

### Compatibility

| Component | Min Version | Max Version | Protocol |
|---|---|---|---|
| master | <MIN> | <MAX> | <PROTO> |
| worker | <MIN> | <MAX> | <PROTO> |
| client | <MIN> | <MAX> | <PROTO> |
| FUSE | <MIN> | <MAX> | <PROTO> |
| CLI | <MIN> | <MAX> | <PROTO> |
| CSI | <MIN> | <MAX> | <PROTO> |

### Known Issues

- _List any known issues, version-specific incompatibilities, or limitations._

### Assets

- **Binary (Rocky Linux 9, x86_64):** `curvine-<VERSION>-linux-amd64.tar.gz`
- **Docker images:** `ghcr.io/curvineio/curvine:<VERSION>`
- **Helm chart:** `curvine-<VERSION>.tgz`

### Release Process

1. Validate the release tag:
   `bash build/validate-release-version.sh v<VERSION>`
2. Build: `BUILD_VERSION=<VERSION> make dist`
3. Verify injected artifact versions.
4. Push the tag to trigger the release workflow.

---

**Full Changelog:** https://github.com/CurvineIO/curvine/compare/v<PREVIOUS>...v<VERSION>
```

## Known Incompatible Versions

Release versions are added to this list when they have critical bugs or
protocol-level incompatibilities that make them unsafe in a mixed-version
cluster. The corresponding `blocked_versions` entry in the master
`compatibility` section is the operational enforcement of these entries:
blocked versions are **always rejected regardless of mode** (emergency
backstop).

| Version | Component | Reason | Introduced In | Resolution |
|---|---|---|---|---|
| 0.2.5 | worker | Critical data corruption bug in batch-write path | 0.2.5 | Upgrade to 0.2.6+ or 0.3.0+ |

### Version-Specific Incompatibilities

**0.3.x legacy workers / clients with 0.4.x master.** Workers and clients
running 0.3.x (or earlier) do not send structured `component_info`. The master
detects them as legacy peers: allowed with a warning in `diagnose` mode
(default), rejected only in `enforce` mode. No data loss or protocol error
occurs; the master simply cannot verify their protocol version, release
version, or capabilities.

**Pre-release vs release bounds.** Pre-release versions sort before the
corresponding release version (`0.4.0-alpha < 0.4.0`). If
`min_worker_version = "0.4.0"` is configured, a pre-release worker is rejected
because it sorts below the bound. To allow pre-releases, lower the minimum
bound accordingly.

## Reporting a New Incompatibility

1. Open a GitHub issue with the **compatibility** label.
2. Include: master version, worker/client version, protocol version of each
   component, the full compatibility error or warning, and reproduction steps.
3. The Curvine team evaluates and either adds the version to `blocked_versions`
   or documents the incompatibility on this page.