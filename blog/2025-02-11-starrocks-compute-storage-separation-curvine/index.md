---
authors: [david]
tags: [benchmark, starrocks, storage]
---

<!-- truncate -->

# StarRocks Compute-Storage Separation: A Real-World Benchmark — How Curvine Cache Closes the Performance Gap

In cloud deployments, compute-storage separation is an increasingly popular choice: object storage cuts cost and compute can scale independently. The trade-off many teams worry about is **performance**. How much slower is separation, and can a cache layer like Curvine make it competitive with colocated storage?

We ran a standard **TPC-DS 100GB** benchmark on StarRocks, comparing colocated (SSD/HDD) and compute-storage separation (Curvine + OSS, and raw OSS) under identical compute. Here’s what we found — and how a single parameter change eliminated an 8× slow-query gap.

---

## 1. Why This Benchmark?

We wanted to measure the impact of **storage architecture** and **disk type** on StarRocks query performance. Same workload, same hardware tier: **99 TPC-DS queries** across 24 tables, with total runtime and average latency as the main metrics.

**Environment (summary):**

| Item | Details |
|------|---------|
| Compute | Alibaba Cloud ECS r6.8xlarge (32 vCPU, 256 GB RAM), 3-node cluster for all setups |
| Configurations | 5: colocated SSD, colocated HDD, separation + Curvine SSD, separation + Curvine HDD, separation + raw OSS |
| Dataset | TPC-DS 100 GB, 99 standard complex queries |

---

## 2. Main Takeaways: Four Findings

**1. Architecture matters more than media.**  
Colocated storage consistently outperformed compute-storage separation, mainly because it avoids cross-node data transfer.

**2. Curvine cache narrows the separation gap.**  
With separation, **Curvine on SSD (362 s total)** was **~16% faster** than raw OSS (419 s). In on-prem or hybrid setups, using Curvine in front of object storage gives a clear performance win.

**3. SSD wins across the board.**  
For both colocated and Curvine-based separation, SSD beat HDD, especially on large scans.

**4. Raw OSS: best cost/performance for non–latency-critical workloads.**  
Raw OSS was the slowest but still only **~41% slower** than the fastest colocated-SSD run. Given its low cost and elasticity, it remains a strong option when peak latency is not the main concern.

---

## 3. Results: Side-by-Side Numbers

| Metric | Colocated (SSD) | Colocated (HDD) | Separation (Curvine SSD) | Separation (Curvine HDD) | Separation (OSS) |
|--------|-----------------|-----------------|---------------------------|---------------------------|------------------|
| **Total time** | 297.96 s | 313.68 s | 361.86 s | 385.20 s | 419.15 s |
| **Relative** | Baseline (100%) | +5.3% | +21.4% | +29.3% | +40.7% |
| **Avg per query** | 3.01 s | 3.17 s | 3.66 s | 3.89 s | 4.23 s |
| **Slowest query** | 52.94 s | 54.40 s | 54.87 s | 55.19 s | 52.66 s |

In short: colocated SSD is fastest (under 300 s total); Curvine-based separation closes much of the gap; and even raw OSS stays at ~4.23 s average per query, which is acceptable for many use cases.

---

## 4. Fixing Slow Queries: Two Case Studies

Two queries (Q05 and Q77) were **5–8× slower** in the separation setup. Root-cause analysis led to a small change that brought them in line with colocated performance.

### Query 05: Why 8× slower?

- **Observed:** ~15 s (separation) vs ~1.8 s (colocated).
- **Cause:** A 3-table union produced ~275M rows (15.33 GB); separation had to pull this across the network (~10 s of the 15 s).
- **Takeaway:** In separation, data is read remotely and then transferred; colocated can read locally.

### Query 77: Full-scan trap

- **Observed:** ~11 s (separation) vs ~1.8 s (colocated).
- **Cause:** Full scan of ~288M rows (14.43 GB); network I/O for remote reads was far slower than local SSD. The optimizer’s “pre-aggregation” strategy also disabled “dynamic filtering,” so unnecessary data was shipped.
- **Fix:** Turn off aggregate pushdown so dynamic filtering can kick in:

```sql
SET cbo_push_down_aggregate_mode = -1;
```

**Effect:** Rows scanned dropped from 275M to 6.11M, and latency matched the colocated run.

---

## 5. Summary and Recommendations

| Goal | Recommendation |
|------|----------------|
| **Highest performance** | Colocated SSD — for real-time analytics and high concurrency. |
| **On-prem / cost-sensitive** | Curvine-based compute-storage separation (SSD backend when possible) — good balance of performance and elasticity. |
| **Public cloud, large storage** | Raw OSS separation — best cost efficiency for non–real-time analytics. |
| **Already on separation** | Apply the optimizer setting above to avoid the slow-query pattern we hit; expect large gains on similar queries. |

Compute-storage separation does not have to mean “slow.” With Curvine as a high-performance cache layer and a few targeted optimizations, StarRocks can deliver strong query performance while keeping the cost and elasticity benefits of object storage.

---

*Original article (Chinese): [实测！StarRocks存算分离性能大揭秘：Curvine缓存竟有这波神操作](https://mp.weixin.qq.com/s/dOlQiXplY5bzl4B8NpNkLw)*
