---
authors: [david]
tags: [teams]
---

<!-- truncate -->

# Curvine: High-Performance Distributed Cache(Now Open Source)

## What is Curvine

&emsp;Curvine is a distributed caching system implemented in Rust, featuring high concurrency, high throughput, low latency, and low resource consumption. Unlike KV caches like Redis or TiKV, Curvine exclusively provides file caching capabilities. It is not a storage system but rather a caching layer - data persistence still relies on underlying file systems or object storage systems for support.

## What problem does it solve

1. Large-scale Data I/O Performance Bottlenecks;
2. Single-Machine Cache Capacity Limitations.

&emsp;In practical applications, what scenarios are suitable for Curvine acceleration?

<div style={{ textAlign: 'center' }}>
  <img src={require("./Curvine-application.png").default} alt="Curvine Application Scenarios." style={{ width: '80%', maxWidth: '800px' }}></img>
  <p style={{ fontSize: '0.8em', color: '#666', marginTop: '8px' }}>
    <b>Fig. 1</b>：Curvine Application Scenarios.
  </p>
</div>

&emsp;As shown in the figure above, Curvine is designed for the following five core scenarios:

1. Accelerating intermediate data processing in big data shuffle operations  
2. Caching hot table data for faster big data analytics  
3. Boosting AI training efficiency through dataset caching  
4. Accelerating model file distribution via caching layer  
5. Cross-cloud data caching to mitigate performance bottlenecks of dedicated cloud connections  

&emsp;These use cases are just the beginning. In simple terms, Curvine fundamentally addresses: The growing conflict between escalating computational demands and the I/O bottlenecks of distributed cache systems.

 ## Architecture Overview
 &emsp; Curvine's architectural design philosophy: Simplicity, Excellence, and Universality.

<div style={{ textAlign: 'center' }}>
  <img src={require("./Curvine-architechure.png").default} alt="Curvine Architecture Diagram." style={{ width: '80%', maxWidth: '800px' }}></img>
  <p style={{ fontSize: '0.8em', color: '#666', marginTop: '8px' }}>
    <b>Fig. 2</b>：Curvine Application Scenarios.
  </p>
</div>

&emsp;**Simplicity**: Lightweight design with only two roles in the caching service: master and worker. For non-performance-critical modules, maximize reuse of open-source or existing technologies, ensuring minimal code complexity.

&emsp;**Excellence**: Key performance-impacting components (e.g., underlying RPC communication framework, Fuse implementation) are independently designed and optimized with a performance-first mindset.

&emsp;**Generality**: Compatible with multiple existing access modes. The underlying storage supports mainstream distributed file and object storage systems, ensuring versatility and ease of use.

## On Open-Source
&emsp;We have achieved significant performance gains by deploying Curvine in high-concurrency, high-throughput big data scenarios internally. Now, we aim to collaborate with external partners to co-build this solution and collectively accelerate the infrastructure transition to Rust.

&emsp;https://github.com/curvineio/curvine

&emsp;Powered by OPPO Bigdata.
