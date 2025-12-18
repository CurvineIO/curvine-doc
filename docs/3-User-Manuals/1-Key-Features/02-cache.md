# Cache

This chapter introduces how to cache data.

## Automatic Caching

After mounting UFS to Curvine, if automatic caching is configured, Curvine will submit an asynchronous caching task when reading a UFS file for the first time, loading the data into Curvine.
In the logs, you can see the following output:
``` 
Submit async cache successfully for s3://bucket/cache/test.log, job res CacheJobResult { job_id: 7c00853f-13c8-43c1-8b3f-44740750b5a0, target_path: /s3/cache/test.log }    
```

You can query the cache task status using job_id:
``` 
bin/cv load-status 7c00853f-13c8-43c1-8b3f-44740750b5a0
```

## Active Data Loading

You can use the load command to actively load UFS data into Curvine, as shown in the example below:
```
bin/cv load s3://bucket/cache/test.log
```
Automatic caching and active caching do not conflict with each other. Active caching can reduce the time of first reading UFS files.

:::tip
Before loading data, UFS must be mounted to Curvine.  
Regardless of automatic caching or active caching, the cache path of the file is fixed and maintains the same directory structure as UFS.
:::

## Cache Data Consistency

To solve the cache data consistency issue, Curvine provides 3 strategies to verify data consistency:
- No verification, data will be automatically deleted after expiration; may read dirty data.
- Periodic verification, checking whether UFS has changed at a certain frequency.
- Forced verification, checking whether UFS has changed every time a file is read, verifying if the length and last modification time of the UFS file are consistent with what Curvine has saved. This is the default configuration.

If the consistency check fails, data will be read directly from UFS, while asynchronously caching the data to Curvine.