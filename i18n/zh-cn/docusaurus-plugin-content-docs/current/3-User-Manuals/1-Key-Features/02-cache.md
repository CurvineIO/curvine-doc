# 缓存
本章节介绍如何缓存数据

## 自动缓存
在挂载 UFS 到 Curvine 后，如果配置了自动缓存，那么在第一次读取 ufs 文件时，curvine 会提交一个异步缓存任务，将数据加载到 Curvine。
在日志中，可以看如下输出：
``` 
Submit async cache successfully for s3://bucket/cache/test.log, job res CacheJobResult { job_id: 7c00853f-13c8-43c1-8b3f-44740750b5a0, target_path: /s3/cache/test.log }    
```

可用 job_id 查询缓存任务状态：
``` 
bin/cv load-status 7c00853f-13c8-43c1-8b3f-44740750b5a0
```

## 主动缓存
可以是load命令主动加载 UFS 数据到 Curvine，示例如下：
```
bin/cv load s3://bucket/cache/test.log
```
自动缓存和主动缓存并不冲突，主动缓存可以减少第一次读取 ufs 文件的时间。


:::tip
load 数据前，UFS 必须先挂载到 Curvine。  
无论自动缓存还是主动缓存，文件的缓存路径是固定的，和 UFS 保持相同的目录结构。
:::


## 缓存数据一致性
为了解决缓存数据一致性问题，Curvine 提供了3种策略校验数据一致性：
- 不校验，数据过期后会自动删除；可能读取到脏数据。
- 定期校验，按照一定的频率检查 UFS 是否变动。
- 强制校验，每次读取文件时都会校验 UFS 是否变动，检查ufs文件的长度、最后修改时间和 Curvine 保存的是否一致。这是默认配置

如果一致性检测失败，会直接从 UFS 读取数据，同时异步缓存数据到 Curvine。