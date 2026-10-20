import Link from 'next/link';
import { CopyInstallCommand } from '@/components/copy-install-command';
import { HomepageIcon } from '@/components/homepage-icons';
import { ScenarioGallery, type ScenarioSlide } from '@/components/scenario-gallery';

/**
 * The original Docusaurus home page, ported to React.
 *
 * The markup and the class names are kept 1:1 with the old
 * `src/pages/index.tsx` + `src/pages/index.css`, so the hero, the circuit-board
 * visual, the feature cards, the stats and the CTA all look exactly as before.
 * Only the two `Link`/`translate` imports differ.
 */
export function Homepage({ locale }: { locale: 'en' | 'zh-cn' }) {
  const zh = locale === 'zh-cn';
  const t = (en: string, cn: string) => (zh ? cn : en);

  const installCommand = 'curl -fsSL https://curvineio.github.io/install.sh | bash';

  // Use-case scenarios shown as a horizontal gif gallery in the
  // "Why Choose Curvine" section. The gifs live in the Docusaurus
  // `static/img/` tree and are mirrored to `/img` by the sync script.
  const useCaseSlides: ScenarioSlide[] = [
    {
      src: '/img/01-ai-agent-platform-storage.gif',
      title: t('AI Agent Platform Storage', 'AI Agent 平台存储'),
      description: t(
        'Gives AI agents a high-performance, file-semantic workspace over cloud object storage.',
        '为 AI Agent 提供基于云对象存储的高性能文件语义工作空间。',
      ),
    },
    {
      src: '/img/02-llm-training-acceleration.gif',
      title: t('LLM Training Acceleration', '大模型训练加速'),
      description: t(
        'Speeds up data loading for training jobs and raises GPU utilization.',
        '加速训练任务的数据加载，提升 GPU 利用率。',
      ),
    },
    {
      src: '/img/03-llm-model-distribution.gif',
      title: t('LLM Model Distribution', '大模型分发加速'),
      description: t(
        'Distributes model weights to inference clusters with shared-cache reads.',
        '通过共享缓存读取，将模型权重快速分发到推理集群。',
      ),
    },
    {
      src: '/img/04-multimodal-data-lake.gif',
      title: t('Multimodal Data Lake', '多模态数据湖'),
      description: t(
        'Unifies file and object access across multimodal datasets in one cache layer.',
        '在统一缓存层中打通多模态数据集的文件与对象访问。',
      ),
    },
    {
      src: '/img/05-olap-query-acceleration.gif',
      title: t('OLAP Query Acceleration', 'OLAP 查询加速'),
      description: t(
        'Caches hot data to cut scan latency and speed up interactive analytics.',
        '缓存热数据以降低扫描延迟，加速交互式分析。',
      ),
    },
    {
      src: '/img/06-multi-cloud-data-caching.gif',
      title: t('Multi-Cloud Data Caching', '多云数据缓存'),
      description: t(
        'Accelerates cross-cloud and hybrid-cloud access with a unified cache.',
        '以统一缓存加速跨云与混合云的数据访问。',
      ),
    },
  ];

  return (
    <div className="curvine-homepage" data-locale={locale}>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-copy">
              <div className="hero-kicker">
                {t('Rust systems software for data acceleration', 'Rust 系统软件，加速数据访问')}
              </div>
              <h1>
                {zh ? (
                  <>
                    AI 原生与云原生
                    <br />
                    文件系统
                  </>
                ) : (
                  <>
                    <span className="title-line title-keep">
                      AI-Native <span className="title-amp">&amp;</span> Cloud-Native
                    </span>
                    <br />
                    <span className="title-line title-keep">FileSystem</span>
                  </>
                )}
              </h1>
              <p>
                {t(
                  'Curvine is a high-performance file semantic layer for cloud object storage, integrated with high-speed cache.',
                  'Curvine 是面向云对象存储的高性能文件语义层，并集成了高速缓存。',
                )}
              </p>
            </div>
            <div className="btn-container">
              <Link href={zh ? '/zh-cn/docs/Deploy/quick-start' : '/docs/Deploy/quick-start'} className="btn btn-primary">
                <HomepageIcon name="download" className="btn-icon" />
                {t('Get Started', '快速开始')}
              </Link>
              <Link
                href={zh ? '/zh-cn/docs/Overview/instroduction' : '/docs/Overview/instroduction'}
                className="btn btn-secondary"
              >
                {t('Learn More', '了解更多')}
                <HomepageIcon name="arrowRight" className="btn-icon" />
              </Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="circuit-board">
              <div className="trace trace-a" />
              <div className="trace trace-b" />
              <div className="trace trace-c" />
              <div className="trace trace-d" />
              <div className="chip-stack">
                <div className="chip chip-shadow" />
                <div className="chip chip-base" />
                <div className="chip chip-top">
                  <span className="chip-mark">C</span>
                  <strong>CURVINE</strong>
                  <small>{t('DISTRIBUTED CACHE', '分布式缓存')}</small>
                </div>
              </div>
              <div className="module-card module-agentic">
                <span className="module-title">{t('Agentic FileSystem', 'Agent 文件系统')}</span>
                <span className="filesystem-rings" />
              </div>
              <div className="module-card module-nodes">
                <span className="module-title">{t('AI/ML Pipelines Accelerate', 'AI/ML 流水线加速')}</span>
                <span className="node-grid" />
              </div>
              <div className="module-card module-inference">
                <span className="module-title">{t('LLM Inference Accelerate', 'LLM 推理加速')}</span>
                <span className="app-grid" />
              </div>
              <div className="module-card module-ai-native">
                <span className="module-title">{t('AI-Native FileSystem', 'AI 原生文件系统')}</span>
                <span className="memory-stack" />
              </div>
              <div className="module-card module-pipeline">
                <span className="module-title">{t('Cloud-Native Storage', '云原生存储')}</span>
                <span className="pipeline-bars" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features section-band" id="features">
        <div className="container">
          <div className="section-title">
            <h2>{t('Core Features', '核心特性')}</h2>
            <p>
              {t(
                'Curvine delivers exceptional performance through innovative architecture and cutting-edge technology.',
                'Curvine 通过创新的架构与前沿技术，带来出色的性能表现。',
              )}
            </p>
          </div>
          <div className="feature-cards three-columns">
            <article className="feature-card">
              <div className="feature-icon"><HomepageIcon name="bolt" /></div>
              <div className="feature-content">
                <h3>{t('High Performance', '高性能')}</h3>
                <p>
                  {t(
                    'Built with Rust for maximum performance, delivering microsecond-level latency and millions of operations per second.',
                    '使用 Rust 构建以获得极致性能，提供微秒级延迟与每秒数百万次操作能力。',
                  )}
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="feature-icon"><HomepageIcon name="nodes" /></div>
              <div className="feature-content">
                <h3>{t('Distributed Architecture', '分布式架构')}</h3>
                <p>
                  {t(
                    'Horizontally scalable architecture with automatic sharding and replication for high availability.',
                    '可水平扩展的架构，具备自动分片与副本能力，保障高可用。',
                  )}
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="feature-icon"><HomepageIcon name="memory" /></div>
              <div className="feature-content">
                <h3>{t('Memory Efficiency', '内存效率')}</h3>
                <p>
                  {t(
                    'Advanced memory management with intelligent caching strategies and automatic garbage collection.',
                    '先进的内存管理，配合智能缓存策略与自动垃圾回收。',
                  )}
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="use-cases section-band" id="use-cases">
        <div className="container">
          <div className="section-title">
            <h2>{t('Why Choose Curvine', '为什么选择 Curvine')}</h2>
            <p>
              {t(
                'Curvine is designed to solve large-scale IO acceleration and break through single-machine memory cache capacity bottlenecks.',
                'Curvine 旨在解决大规模 IO 加速问题，并突破单机内存缓存容量瓶颈。',
              )}
            </p>
          </div>
          <ScenarioGallery slides={useCaseSlides} />
        </div>
      </section>

      <section className="performance section-band" id="performance">
        <div className="container">
          <div className="section-title">
            <h2>{t('Exceptional Performance', '卓越性能')}</h2>
            <p>
              {t(
                'Curvine supports 5 billion small files in a single cluster, delivers 100K+ QPS, keeps latency at 100us, and uses only 1 GB of memory.',
                'Curvine 单集群支持 50 亿小文件、10 万+ QPS，延迟保持在 100 微秒，仅占用 1 GB 内存。',
              )}
            </p>
          </div>
          <div className="performance-stats">
            <article className="stat-card">
              <div className="stat-icon"><HomepageIcon name="gauge" /></div>
              <div className="stat-number">100us</div>
              <div className="stat-label">{t('Latency', '延迟')}</div>
            </article>
            <article className="stat-card">
              <div className="stat-icon"><HomepageIcon name="bolt" /></div>
              <div className="stat-number">{zh ? '10w+' : '100K+'}</div>
              <div className="stat-label">{t('Operations/sec', '每秒操作数')}</div>
            </article>
            <article className="stat-card">
              <div className="stat-icon"><HomepageIcon name="database" /></div>
              <div className="stat-number">{zh ? '50亿' : '5B'}</div>
              <div className="stat-label">{t('Single-Cluster Small Files', '单集群小文件')}</div>
            </article>
          </div>
        </div>
      </section>

      <section className="getting-started section-band" id="getting-started">
        <div className="container">
          <div className="section-title">
            <h2>{t('Get Started in Minutes', '几分钟即可上手')}</h2>
            <p>
              {t(
                'Deploy Curvine quickly with our comprehensive documentation and tools.',
                '借助完善的文档与工具，快速部署 Curvine。',
              )}
            </p>
          </div>
          <div className="getting-started-steps">
            <article className="step-card">
              <span className="step-number">1</span>
              <div className="step-icon"><HomepageIcon name="terminal" /></div>
              <h3>{t('Install', '安装')}</h3>
              <p>
                {t(
                  'Download and install Curvine using our simple installation script.',
                  '使用简单的安装脚本下载并安装 Curvine。',
                )}
              </p>
            </article>
            <article className="step-card">
              <span className="step-number">2</span>
              <div className="step-icon"><HomepageIcon name="sliders" /></div>
              <h3>{t('Configure', '配置')}</h3>
              <p>
                {t(
                  'Set up your cluster configuration with our intuitive configuration files.',
                  '通过直观的配置文件完成集群配置。',
                )}
              </p>
            </article>
            <article className="step-card">
              <span className="step-number">3</span>
              <div className="step-icon"><HomepageIcon name="rocket" /></div>
              <h3>{t('Deploy', '部署')}</h3>
              <p>
                {t(
                  'Launch your high-performance caching cluster and start serving requests.',
                  '启动高性能缓存集群并开始对外提供服务。',
                )}
              </p>
            </article>
          </div>
          <div className="install-command-card">
            <CopyInstallCommand command={installCommand} locale={locale} />
            <p>
              {t(
                'If Docker is available on your machine, run the following command in your terminal, then follow the on-screen instructions to start a local Curvine demo cluster.',
                '如果你的机器上已安装 Docker，可在终端执行下面的命令，然后按屏幕提示启动本地 Curvine 演示集群。',
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-grid">
          <div>
            <h2>{t('Ready to Get Started with Curvine?', '准备开始使用 Curvine 了吗？')}</h2>
            <p>
              {t(
                "Download now and experience Curvine's high-performance file semantic layer for cloud object storage.",
                '立即下载，体验 Curvine 面向云对象存储的高性能文件语义层。',
              )}
            </p>
            <div className="btn-container">
              <a
                href="https://github.com/CurvineIO/curvine/releases"
                className="btn btn-light"
                target="_blank"
                rel="noreferrer"
              >
                {t('Download Now', '立即下载')}
              </a>
              <a
                href="https://github.com/CurvineIO/curvine"
                className="btn btn-outline-light"
                target="_blank"
                rel="noreferrer"
              >
                {t('View Source', '查看源码')}
              </a>
            </div>
          </div>
          <div className="cta-chip" aria-hidden="true">
            <span />
          </div>
        </div>
      </section>
    </div>
  );
}
