---
authors: [david]
tags: [teams]
---

# 高性能分布式缓存Curvine，低调开源

## Curvine是什么
&emsp;Curvine是一套分布式缓存系统，基于Rust实现，具备 高并发，高吞吐，低延迟，资源消耗低等特点。不同于Redis、TiKV等KV缓存，Curvine只提供文件缓存能力。Curvine不是存储系统，只提供缓存能力，数据持久化还是需要底层文件或者对象存储系统支撑。

## 解决什么问题

1. 大规模数据IO性能瓶颈
2. 单机缓存系统容量瓶颈

实际应用中，有哪些场景适用Curvine加速？

<div style={{ textAlign: 'center' }}>
  <img src={require("./Curvine-application.png").default} alt="Curvine Application Scenarios." style={{ width: '80%', maxWidth: '800px' }}></img>
  <p style={{ fontSize: '0.8em', color: '#666', marginTop: '8px' }}>
    <b>Fig. 1</b>：Curvine Application Scenarios.
  </p>
</div>

如上图所示，Curvine适用于以下五大场景：

1. 大数据shuffle 中间数据加速
2. 大数据热表数据缓存加速
3. AI训练数据缓存加速
4. 模型文件分发缓存加速
5. 多云数据缓存，解决跨云专线性能瓶颈

以上场景总结，只是抛砖引玉，通俗的理解，Curvine其实就是解决： 日益增长的计算性能需求与分布式存储系统的IO能力瓶颈的矛盾。
 
## 架构简介

&emsp;Curvine架构设计理念：简单、极致、通用。


<div style={{ textAlign: 'center' }}>
  <img src={require("./Curvine-architechure.png").default} alt="Curvine Architecture Diagram." style={{ width: '80%', maxWidth: '800px' }}></img>
  <p style={{ fontSize: '0.8em', color: '#666', marginTop: '8px' }}>
    <b>Fig. 2</b>：Curvine Application Scenarios.
  </p>
</div>

&emsp;**简单**：简单轻量，缓存服务只有两个角色：master、worker。非性能瓶颈的模块，尽量复用开源或者已有的技术，代码最大可能轻量化。

&emsp;**极致**：对性能影响较大的关键节点：底层rpc通信架构、Fuse 实现性能等关键组件，自主设计实现，以极致性能优化思维构建。

&emsp;**通用**:：兼容多种现有接入模式，底层存储兼容主流分布式文件和对象存储做到足够通用，易用。

## 关于开源
&emsp;我们在内部大数据高并发高吞吐场景下使用Curvine加速数据IO，取得比较大的收益。希望吸引外部的伙伴共同建设，一起加速基础设施向Rust转变。
&emsp;https://github.com/curvineio/curvine

&emsp; 由OPPO大数据提供支持。
