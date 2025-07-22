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

## Performance
&emsp;We demonstrate performance and resource utilization from the following aspects:​

**1. Metadata operation performance**
<!-- 表格区 -->
   <table>
  <thead>
    <tr style={{ backgroundColor: '#2ecc71', color: 'white' }}>
      <th>Operation Type</th>
      <th>Curvine (QPS)</th>
      <th>Juicefs (QPS)</th>
      <th>oss (QPS)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>create</td>
      <td style={{ textAlign: 'right' }}>19,985</td>
      <td style={{ textAlign: 'right' }}>16,000</td>
      <td style={{ textAlign: 'right' }}>2,000</td>
    </tr>
    <tr>
      <td>open</td>
      <td style={{ textAlign: 'right' }}>60,376</td>
      <td style={{ textAlign: 'right' }}>50,000</td>
      <td style={{ textAlign: 'right' }}>3,900</td>
    </tr>
    <tr>
      <td>rename</td>
      <td style={{ textAlign: 'right' }}>43,009</td>
      <td style={{ textAlign: 'right' }}>21,000</td>
      <td style={{ textAlign: 'right' }}>200</td>
    </tr>
    <tr>
      <td>delete</td>
      <td style={{ textAlign: 'right' }}>39,013</td>
      <td style={{ textAlign: 'right' }}>41,000</td>
      <td style={{ textAlign: 'right' }}>1,900</td>
    </tr>
  </tbody>
</table>

&emsp;**Note**: All benchmark comparisons were conducted with a concurrency level of 40.

&emsp;**Detailed results**: https://curvineio.github.io/docs/Benchmark/meta/

&emsp;**Industry benchmark test data of comparable products**: https://juicefs.com/zh-cn/blog/engineering/meta-perf-hdfs-oss-jfs


**2. Data Read/Write Performance**

&emsp;Benchmarking Alluxio performance under identical hardware conditions:

● 256K sequential read
  <!-- 表格区 -->
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr style={{ backgroundColor: '#2ecc71', color: 'white' }}>
        <th>Thread count</th>
        <th>Curvine Open Source Edition (GiB/s)</th>
        <th>Throughput of Open Source Alluxio (GiB/s)</th>
      </tr>
    </thead>
    <tbody>
      <!-- 数据行模板 -->
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>1</td>
        <td style={{ textAlign: 'right' }}>2.2</td>
        <td style={{ textAlign: 'right' }}>0.6</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>2</td>
        <td style={{ textAlign: 'right' }}>3.7</td>
        <td style={{ textAlign: 'right' }}>1.1</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>4</td>
        <td style={{ textAlign: 'right' }}>6.8</td>
        <td style={{ textAlign: 'right' }}>2.3</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>8</td>
        <td style={{ textAlign: 'right' }}>8.9</td>
        <td style={{ textAlign: 'right' }}>4.5</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>16</td>
        <td style={{ textAlign: 'right' }}>9.2</td>
        <td style={{ textAlign: 'right' }}>7.9</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>32</td>
        <td style={{ textAlign: 'right' }}>9.5</td>
        <td style={{ textAlign: 'right' }}>8.8</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>64</td>
        <td style={{ textAlign: 'right' }}>9.2</td>
        <td style={{ textAlign: 'right' }}>N/A</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>128</td>
        <td style={{ textAlign: 'right' }}>9.2</td>
        <td style={{ textAlign: 'right' }}>N/A</td>
      </tr>
    </tbody>
  </table>
  
● 256K random read
<!-- 表格区 -->
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr style={{ backgroundColor: '#2ecc71', color: 'white' }}>
        <th>Thread count</th>
        <th>Curvine Open Source Edition (GiB/s)</th>
        <th>Throughput of Open Source Alluxio (GiB/s)</th>
      </tr>
    </thead>
    <tbody>
      <!-- 数据行模板 -->
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>1</td>
        <td style={{ textAlign: 'right' }}>0.3</td>
        <td style={{ textAlign: 'right' }}>0.0</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>2</td>
        <td style={{ textAlign: 'right' }}>0.7</td>
        <td style={{ textAlign: 'right' }}>0.1</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>4</td>
        <td style={{ textAlign: 'right' }}>1.4</td>
        <td style={{ textAlign: 'right' }}>0.1</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>8</td>
        <td style={{ textAlign: 'right' }}>2.8</td>
        <td style={{ textAlign: 'right' }}>0.2</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>16</td>
        <td style={{ textAlign: 'right' }}>5.2</td>
        <td style={{ textAlign: 'right' }}>0.4</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>32</td>
        <td style={{ textAlign: 'right' }}>7.8</td>
        <td style={{ textAlign: 'right' }}>0.3</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>64</td>
        <td style={{ textAlign: 'right' }}>8.7</td>
        <td style={{ textAlign: 'right' }}>N/A</td>
      </tr>
      <tr style={{ borderBottom: '1px solid #e1e4e8' }}>
        <td style={{ textAlign: 'right' }}>128</td>
        <td style={{ textAlign: 'right' }}>9.0</td>
        <td style={{ textAlign: 'right' }}>N/A</td>
      </tr>
    </tbody>
  </table>

 &emsp; Data disclosure from Alluxio official website: https://www.alluxio.com.cn/alluxio-enterprise-vs-open-source/.

**3. Resource consumption**


 &emsp; Thanks to Rust's language features, in the big data shuffle acceleration scenario, our comparison of online resource consumption between Curvine and Alluxio shows a ​90%+ reduction in memory usage​ and ​50%+ reduction in CPU usage.

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
