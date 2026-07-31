# The Last Mile of the Multimodal Data Lake: How Curvine Makes LanceDB Vector Search 5x Faster

![LanceDB × Curvine: 5x faster query performance](./lancedb-curvine-5x.png)

## Introduction

Over the past two years, multimodal data lakes have become a standard answer for AI infrastructure: images, videos, text, and embeddings all live in object storage; columnar formats such as Lance and Parquet provide unified data management; and engines such as LanceDB run vector, full-text, and hybrid search directly on the lake. Compute and storage are decoupled, capacity is virtually unlimited, and costs stay low. It sounds almost perfect.

But teams that move online retrieval workloads onto this architecture encounter the same problem: object storage has plenty of capacity and bandwidth, but not low latency. A single vector-retrieval request may trigger dozens or hundreds of small random reads. Each read pays the object's time-to-first-byte penalty, and the longer the path, the worse the tail latency becomes.

We ran a benchmark on Alibaba Cloud using the same LanceDB version, the same one-million-row dataset of 1,536-dimensional vectors, and the same benchmark scripts. The only change was replacing direct OSS access with Curvine, a high-performance distributed cache system written in Rust. Vector-search p50 latency fell from 11 ms to 2 ms, QPS rose from 69 to 333, and p99 latency dropped from 62 ms to 10 ms.

This article presents the complete results and analysis, including the scenario where the improvement was limited—and why.

## 1. Where Is the Bottleneck? The I/O Profile of Vector Search

A vector query over a data lake roughly follows these steps:

1. Read index metadata, such as IVF centroids and partition offsets.
2. Read several index fragments from the partitions selected by `nprobes`.
3. After obtaining candidate row IDs, read the original columns—vectors, `title`, `text`, and so on—to retrieve actual values for reranking.
4. Full-text search also reads inverted-index structures. Hybrid search executes both paths and then applies Reciprocal Rank Fusion (RRF).

This access pattern consists of small, highly fanned-out, random reads. Object storage delivers excellent throughput, but every range read incurs a fixed cost for a network round trip and server-side lookup, typically several to tens of milliseconds. When one query chains together dozens of these reads, fixed overhead dominates latency. Adding machines or bandwidth does not help because the bottleneck is not bandwidth; it is the inherent latency of each I/O operation.

This is exactly where Curvine fits. Curvine is a distributed cache file system that places hot data in Worker memory and on local NVMe or ESSD devices. Clients access it through native RPC, FUSE, or a Hadoop-compatible interface. Object storage remains the system of record, but each random read on the hot path changes from "access object storage over the network" to "access a cache node in the same availability zone plus a local disk." This reduces per-I/O latency by an order of magnitude.

## 2. Test Environment and Methodology

To avoid the appearance of writing a benchmark tailored to our own system, we used LanceDB's official benchmark suite.

| Item | Configuration |
| --- | --- |
| LanceDB version | 0.34.0 |
| Benchmark | Official `lancedb-cloud-benchmarks` suite |
| Dataset | `KShivendu/dbpedia-entities-openai-1M` (approximately 1 million rows, 1,536 dimensions) |
| Queries | 10,000 per test group |
| `nprobes` / `limit` | Default values |
| Concurrency | Single process (`query_processes=1`) |

The cluster was deployed on Alibaba Cloud:

- **Curvine test cluster:** one Master and one Worker, both `ecs.r8a.8xlarge` instances with 32 vCPUs and 247 GB of memory. The Worker had an additional 1.3 TB ESSD cloud disk.
- **Query node:** one `ecs.r8a.4xlarge` instance with 16 vCPUs and 123 GB of memory.

This was a minimal, single-Worker cluster without multi-replica or multi-node parallel-read optimization. In other words, the results below represent a lower bound for Curvine, not its ceiling.

We tested four query types that cover common multimodal-retrieval patterns:

- **`vector`:** search using random 1,536-dimensional vectors.
- **`fts`:** randomly select terms from a built-in vocabulary and run full-text search on `title`.
- **`hybrid`:** combine a random vector and random text, followed by RRF reranking.
- **`vector_with_filter`:** combine a random vector with `text LIKE '%term%'` and `prefilter=True`.

The core variable was the storage path:

- **`oss`:** data and indexes both reside directly in OSS.
- **`curvine-index`:** data remains at its OSS URI, while only the index directory (`_indices`) is placed in Curvine's cache.
- **`curvine`:** both data and indexes use `curvine://` and are served through the cache.

The second mode is especially important: it changes only the index location and barely affects the organization of an existing data lake. For many teams, it is the easiest way to get started.

## 3. Benchmark Results

All latency values are in milliseconds. Higher QPS is better; lower latency percentiles are better.

### 3.1 Vector: Pure Vector Search

| Storage | QPS | p50 | p90 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `oss` | 69.4 | 11 | 26 | 34 | 62 |
| `curvine-index` | 76.9 | 9 | 23 | 32 | 51 |
| `curvine` | **333.3** | **2** | **3** | **4** | **10** |

With the full Curvine path, p50 latency fell to one-fifth-and-a-half of the OSS result, while QPS improved by approximately 4.8x. More importantly, p90 fell from 26 ms to 3 ms—about 8.7x lower—and p99 dropped from 62 ms to 10 ms. A better average is useful; flattening tail latency is what makes a system ready for production.

### 3.2 FTS: Full-Text Search

| Storage | QPS | p50 | p90 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `oss` | 31.4 | 26 | 53 | 61 | 88 |
| `curvine-index` | 71.4 | 12 | 20 | 25 | 37 |
| `curvine` | **144.9** | **5** | **8** | **13** | **15** |

Full-text search produced the most interesting benefit profile. Moving only the index into Curvine increased QPS by 2.3x and more than halved p50 latency. The reason is straightforward: accesses to an inverted index are more fragmented than accesses to a vector index and are therefore more sensitive to per-I/O latency. Accelerating only the index captures much of the benefit. The full Curvine path reduced p50 to 5 ms and p99 from 88 ms to 15 ms.

### 3.3 Hybrid: Vector and Full-Text Search with RRF Reranking

| Storage | QPS | p50 | p90 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `oss` | 25.2 | 36 | 58 | 66 | 90 |
| `curvine-index` | 37.9 | 24 | 35 | 40 | 52 |
| `curvine` | **73.5** | **13** | **14** | **15** | **21** |

Hybrid search is closest to a real multimodal workload. It pays the I/O cost of both the vector and full-text paths, so its OSS baseline is the worst, with a p50 of 36 ms. Curvine reduced p50 to 13 ms—approximately 2.8x lower—and increased QPS by 2.9x.

The latency distribution is the standout result: 13 ms at p50, 14 ms at p90, 15 ms at p95, and 21 ms at p99. The curve is nearly flat. With OSS, the same percentiles rise continuously from 36 to 58, 66, and 90 ms. For a retrieval service embedded in a RAG pipeline, predictable latency is often more valuable than a lower average alone.

### 3.4 Vector with Filter

| Storage | QPS | p50 | p90 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `oss` | 2.6 | 377 | 401 | 415 | 456 |
| `curvine-index` | 2.6 | 378 | 401 | 412 | 446 |
| `curvine` | **3.9** | **249** | **257** | **265** | **450** |

We include this result as measured: `curvine-index` provided almost no improvement over OSS, while the full Curvine path improved performance by only about 1.5x.

The reason is that this query has a completely different cost profile. With `prefilter=True`, `text LIKE '%term%'` first performs a full scan and match over the text column, then feeds the result into vector search. Overall p50 latency is approximately 250–380 ms. The bottleneck lies in filtering and scan computation, not index I/O. Caching can optimize only a small part of the total runtime, so it cannot produce a 5x gain.

This result reinforces the credibility of the first three tests. Curvine accelerates I/O latency: I/O-bound scenarios benefit greatly, while CPU- or scan-bound scenarios see limited gains. The appropriate solution for this kind of filtered query is to build a scalar index on the filter field or replace `LIKE` with an inverted index—not to keep adding cache capacity.

## 4. Summary: Improvement over OSS

| Query type | `curvine-index` vs. `oss` | `curvine` vs. `oss` |
| --- | --- | --- |
| Vector | p50: 11 → 9 ms (~1.1x); QPS: 69 → 77 | p50: 11 → 2 ms (~5.5x); QPS: 69 → 333 |
| FTS | p50: 26 → 12 ms (~2.2x); QPS: 31 → 71 | p50: 26 → 5 ms (~5.2x); QPS: 31 → 145 |
| Hybrid | p50: 36 → 24 ms (~1.5x); QPS: 25 → 38 | p50: 36 → 13 ms (~2.8x); QPS: 25 → 74 |
| Vector with filter | Comparable performance | p50: 377 → 249 ms (~1.5x); QPS: 2.6 → 3.9 |

Four conclusions stand out:

1. **The full Curvine path performed best across all query types.** Vector and full-text search benefited most: p50 fell to roughly one-fifth of the OSS result, while QPS improved by 4–5x.
2. **Caching only the index still delivered meaningful gains.** The effect was especially clear for full-text and hybrid search, at 1.5–2.2x, with a smaller improvement for vector search.
3. **Vector search with a filter was the exception.** Its bottleneck was filtering and scanning rather than index I/O, so it requires better index design instead of more caching.
4. **Latency consistency improved even more than average latency.** Both p90 and p99 were lower across the Curvine path, and hybrid-search latency became nearly flat across percentiles.

## 5. Deployment: Two Adoption Strategies

The results suggest a practical two-stage adoption path.

### Option 1: Cache Only the Index for a Low-Cost Trial

Keep the existing OSS layout of the data lake and point only Lance's `_indices` directory to Curvine. This requires minimal change, no data migration, and no disruption to existing ingestion or archival workflows. It can still deliver 1.5–2.2x gains for full-text and hybrid search. Because the cache needs to cover only the index footprint, the cost is low.

This option is well suited to teams that want to validate the benefit first, or whose hot index data is much smaller than the full dataset.

### Option 2: Use Curvine End to End for Maximum Performance

Mount the complete dataset under `curvine://` so that the entire read path uses the cache. This approach delivers improvements on the order of 5x and much flatter tail latency, but the cache must be large enough to hold the working set.

For latency-sensitive paths such as online retrieval services and RAG recall, this is the recommended architecture.

Curvine supports several access methods and can be adopted without changing application code. For example, mount it through FUSE and use it as a local directory:

```bash
bin/curvine-fuse.sh start
ls /curvine-fuse
```

Curvine also provides a native Rust API and a Hadoop-compatible interface using `cv://`:

```java
Configuration conf = new Configuration();
conf.set("fs.cv.impl", "io.curvine.CurvineFileSystem");
FileSystem fs = FileSystem.get(URI.create("cv://master:8995"), conf);
```

## 6. Final Thoughts

A multimodal data lake solves the question of where to store data, but not how quickly to read it. Object storage is economical because data is kept farther away; online retrieval feels fast when data is brought closer. A cache layer is needed to reconcile those two goals.

The main lesson from this benchmark is simple: in a disaggregated compute-and-storage architecture, reducing the latency of small random I/O often provides better value than switching to a more powerful retrieval engine or adding more query nodes. We used the same LanceDB, the same data, and the same query-node specification. Changing only the storage path delivered a 5x latency improvement, even with a minimal Curvine cluster containing just one Worker.

The test that did not improve is equally important. Caching is not a universal remedy; it targets I/O latency precisely. When the bottleneck moves to scanning and computation, it is time to use a different tool. Knowing where a technology does not help matters as much as knowing where it does.

Curvine is open source under the Apache License 2.0. Beyond accelerating vector retrieval, it is used for training-data acceleration, model distribution, hot-table acceleration, big-data shuffle acceleration, and multi-cloud caching. Try it, open an issue, or contribute:

- **GitHub:** [github.com/CurvineIO/curvine](https://github.com/CurvineIO/curvine)
- **Documentation:** [curvineio.github.io](https://curvineio.github.io/docs/Overview/instroduction)
- **Quick Start:** [Deploy Curvine](https://curvineio.github.io/docs/Deploy/quick-start)

> **Benchmark note:** Results were measured on Alibaba Cloud with LanceDB 0.34.0 and the `dbpedia-entities-openai-1M` dataset. Each test group ran 10,000 queries in a single process. The Curvine deployment used a minimal one-Master, one-Worker cluster. Results will vary with hardware, dataset size, and concurrency; validate performance with your own production workload.
