import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Translate, {translate} from "@docusaurus/Translate";
import "./index.css";

function HomePage() {
  const {siteConfig, i18n} = useDocusaurusContext();
  const installCommand = "curl -fsSL https://curvineio.github.io/install.sh | bash";
  const [isInstallCommandCopied, setIsInstallCommandCopied] = React.useState(false);

  const markInstallCommandCopied = () => {
    setIsInstallCommandCopied(true);
    window.setTimeout(() => setIsInstallCommandCopied(false), 1800);
  };

  const handleCopyInstallCommand = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(installCommand);
        markInstallCommandCopied();
        return;
      }
    } catch {
      // Fall back for non-secure origins or browsers that block clipboard access.
    }

    const textArea = document.createElement("textarea");
    textArea.value = installCommand;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    markInstallCommandCopied();
  };

  return (
    <Layout
      title={translate({
        id: "homepage.title",
        message: "Curvine - High-Performance Distributed Caching FileSystem",
        description: "The homepage title",
      })}
      description={siteConfig.tagline}
      wrapperClassName="curvine-homepage"
    >
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-copy">
              <div className="hero-kicker"><Translate id="homepage.hero.kicker" description="Hero eyebrow text">Rust systems software for data acceleration</Translate></div>
              <h1>
                {i18n.currentLocale === "zh-cn" ? (
                  <>
                    高性能分布式<br />缓存文件系统
                  </>
                ) : (
                  <>
                    High-Performance Distributed <span className="title-keep">Caching FileSystem</span>
                  </>
                )}
              </h1>
              <p>
                <Translate id="homepage.hero.subtitle" description="The hero subtitle on the homepage">
                  Curvine is a high-performance distributed caching filesystem implemented in Rust, designed for low-latency and high-throughput workloads with powerful data governance capabilities.
                </Translate>
              </p>
            </div>
            <div className="btn-container">
              <Link to="/docs/Deploy/quick-start" className="btn btn-primary">
                <span className="btn-icon btn-icon-download" aria-hidden="true" />
                <Translate id="homepage.hero.getStarted" description="Get started button text">
                  Get Started
                </Translate>
              </Link>
              <Link to="/docs/Overview/instroduction" className="btn btn-secondary">
                <Translate id="homepage.hero.learnMore" description="Learn more button text">
                  Learn More
                </Translate>
                <span className="btn-icon btn-icon-arrow" aria-hidden="true" />
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
                  <small><Translate id="homepage.visual.chip.label" description="Hero chip label">DISTRIBUTED CACHE</Translate></small>
                </div>
              </div>
              <div className="module-card module-agentic">
                <span className="module-title"><Translate id="homepage.visual.modules.agentic" description="Agentic filesystem module label">Agentic FileSystem</Translate></span>
                <span className="filesystem-rings" />
              </div>
              <div className="module-card module-nodes">
                <span className="module-title"><Translate id="homepage.visual.modules.nodes" description="AI and ML pipelines acceleration module label">AI/ML Pipelines Accelerate</Translate></span>
                <span className="node-grid" />
              </div>
              <div className="module-card module-inference">
                <span className="module-title"><Translate id="homepage.visual.modules.inference" description="LLM inference acceleration module label">LLM Inference Accelerate</Translate></span>
                <span className="app-grid" />
              </div>
              <div className="module-card module-ai-native">
                <span className="module-title"><Translate id="homepage.visual.modules.aiNative" description="AI-native filesystem module label">AI-Native FileSystem</Translate></span>
                <span className="memory-stack" />
              </div>
              <div className="module-card module-pipeline">
                <span className="module-title"><Translate id="homepage.visual.modules.pipeline" description="Cloud-native storage module label">Cloud-Native Storage</Translate></span>
                <span className="pipeline-bars" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features section-band" id="features">
        <div className="container">
          <div className="section-title">
            <h2>
              <Translate id="homepage.features.title" description="Features section title">
                Core Features
              </Translate>
            </h2>
            <p>
              <Translate id="homepage.features.subtitle" description="Features section subtitle">
                Curvine delivers exceptional performance through innovative architecture and cutting-edge technology.
              </Translate>
            </p>
          </div>
          <div className="feature-cards three-columns">
            <article className="feature-card">
              <div className="feature-icon icon-performance" />
              <div className="feature-content">
                <h3>
                  <Translate id="homepage.features.performance.title" description="High performance feature title">
                    High Performance
                  </Translate>
                </h3>
                <p>
                  <Translate id="homepage.features.performance.description" description="High performance feature description">
                    Built with Rust for maximum performance, delivering microsecond-level latency and millions of operations per second.
                  </Translate>
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="feature-icon icon-distributed" />
              <div className="feature-content">
                <h3>
                  <Translate id="homepage.features.distributed.title" description="Distributed architecture feature title">
                    Distributed Architecture
                  </Translate>
                </h3>
                <p>
                  <Translate id="homepage.features.distributed.description" description="Distributed architecture feature description">
                    Horizontally scalable architecture with automatic sharding and replication for high availability.
                  </Translate>
                </p>
              </div>
            </article>
            <article className="feature-card">
              <div className="feature-icon icon-memory" />
              <div className="feature-content">
                <h3>
                  <Translate id="homepage.features.memory.title" description="Memory efficiency feature title">
                    Memory Efficiency
                  </Translate>
                </h3>
                <p>
                  <Translate id="homepage.features.memory.description" description="Memory efficiency feature description">
                    Advanced memory management with intelligent caching strategies and automatic garbage collection.
                  </Translate>
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="use-cases section-band" id="use-cases">
        <div className="container">
          <div className="section-title">
            <h2>
              <Translate id="homepage.usecases.title" description="Use cases section title">
                Why Choose Curvine
              </Translate>
            </h2>
            <p>
              <Translate id="homepage.usecases.subtitle" description="Use cases section subtitle">
                Curvine is designed to solve large-scale IO acceleration and break through single-machine memory cache capacity bottlenecks.
              </Translate>
            </p>
          </div>
          <div className="feature-cards four-columns compact-cards">
            <article className="feature-card">
              <div className="feature-icon icon-training" />
              <h3><Translate id="homepage.usecases.ai.title" description="AI training acceleration use case title">AI Training Acceleration</Translate></h3>
              <p><Translate id="homepage.usecases.ai.description" description="AI training acceleration use case description">Provides high-speed data access for deep learning training, significantly reducing data loading time, improving GPU utilization, and accelerating model training processes.</Translate></p>
            </article>
            <article className="feature-card">
              <div className="feature-icon icon-inference" />
              <h3><Translate id="homepage.usecases.inference.title" description="Large model inference use case title">Large Model Inference Acceleration</Translate></h3>
              <p><Translate id="homepage.usecases.inference.description" description="Large model inference use case description">Optimizes data access for large language model inference scenarios, reducing inference latency and improving model service response speed and throughput.</Translate></p>
            </article>
            <article className="feature-card">
              <div className="feature-icon icon-olap" />
              <h3><Translate id="homepage.usecases.olap.title" description="OLAP engine use case title">OLAP Engine Query Acceleration</Translate></h3>
              <p><Translate id="homepage.usecases.olap.description" description="OLAP engine use case description">Provides high-speed caching for analytical databases and OLAP engines, significantly improving complex query performance and reducing data analysis time.</Translate></p>
            </article>
            <article className="feature-card">
              <div className="feature-icon icon-bigdata" />
              <h3><Translate id="homepage.usecases.bigdata.title" description="Big data computing use case title">Big Data Computing</Translate></h3>
              <p><Translate id="homepage.usecases.bigdata.description" description="Big data computing use case description">Provides hot data caching and shuffle acceleration for big data offline computing, significantly improving data processing efficiency.</Translate></p>
            </article>
          </div>
        </div>
      </section>

      <section className="performance section-band" id="performance">
        <div className="container">
          <div className="section-title">
            <h2>
              <Translate id="homepage.performance.title" description="Exceptional Performance section title">
                Exceptional Performance
              </Translate>
            </h2>
            <p>
              <Translate id="homepage.performance.subtitle" description="Exceptional Performance section subtitle">
                Curvine keeps 100K concurrent clients stably connected with low-latency metadata operations and around 1 GB of connection memory overhead.
              </Translate>
            </p>
          </div>
          <div className="performance-stats">
            <article className="stat-card">
              <div className="stat-icon stat-latency" />
              <div className="stat-number">&lt; 1ms</div>
              <div className="stat-label"><Translate id="homepage.performance.latency" description="Latency performance metric">Average Latency</Translate></div>
            </article>
            <article className="stat-card">
              <div className="stat-icon stat-throughput" />
              <div className="stat-number">{i18n.currentLocale === "zh-cn" ? "10w+" : "100K+"}</div>
              <div className="stat-label"><Translate id="homepage.performance.ops" description="Operations per second metric">Operations/sec</Translate></div>
            </article>
            <article className="stat-card">
              <div className="stat-icon stat-uptime" />
              <div className="stat-number">99.99%</div>
              <div className="stat-label"><Translate id="homepage.performance.uptime" description="Uptime performance metric">Uptime SLA</Translate></div>
            </article>
          </div>
        </div>
      </section>

      <section className="getting-started section-band" id="getting-started">
        <div className="container">
          <div className="section-title">
            <h2>
              <Translate id="homepage.gettingstarted.title" description="Getting started section title">
                Get Started in Minutes
              </Translate>
            </h2>
            <p>
              <Translate id="homepage.gettingstarted.subtitle" description="Getting started section subtitle">
                Deploy Curvine quickly with our comprehensive documentation and tools.
              </Translate>
            </p>
          </div>
          <div className="getting-started-steps">
            <article className="step-card">
              <span className="step-number">1</span>
              <div className="step-icon step-install" />
              <h3><Translate id="homepage.gettingstarted.step1.title" description="Step 1 title">Install</Translate></h3>
              <p><Translate id="homepage.gettingstarted.step1.description" description="Step 1 description">Download and install Curvine using our simple installation script.</Translate></p>
            </article>
            <article className="step-card">
              <span className="step-number">2</span>
              <div className="step-icon step-configure" />
              <h3><Translate id="homepage.gettingstarted.step2.title" description="Step 2 title">Configure</Translate></h3>
              <p><Translate id="homepage.gettingstarted.step2.description" description="Step 2 description">Set up your cluster configuration with our intuitive configuration files.</Translate></p>
            </article>
            <article className="step-card">
              <span className="step-number">3</span>
              <div className="step-icon step-deploy" />
              <h3><Translate id="homepage.gettingstarted.step3.title" description="Step 3 title">Deploy</Translate></h3>
              <p><Translate id="homepage.gettingstarted.step3.description" description="Step 3 description">Launch your high-performance caching cluster and start serving requests.</Translate></p>
            </article>
          </div>
          <div className="install-command-card">
            <div className="install-command-copy">
              <div>
                <span className="install-command-eyebrow">
                  <Translate id="homepage.gettingstarted.command.eyebrow" description="Install command eyebrow">
                    Run this in your terminal
                  </Translate>
                </span>
                <div className="install-command-line">
                  <code>{installCommand}</code>
                </div>
              </div>
              <button
                type="button"
                className={`install-command-button${isInstallCommandCopied ? " install-command-button--copied" : ""}`}
                onClick={handleCopyInstallCommand}
                aria-live="polite"
              >
                {isInstallCommandCopied ? (
                  <Translate id="homepage.gettingstarted.command.copied" description="Copied install command button feedback">
                    Copied
                  </Translate>
                ) : (
                  <Translate id="homepage.gettingstarted.command.copy" description="Copy install command button">
                    Copy
                  </Translate>
                )}
              </button>
            </div>
            <p>
              <Translate id="homepage.gettingstarted.command.note" description="Install command helper text">
                If Docker is available on your machine, run the following command in your terminal, then follow the on-screen instructions to start a local Curvine demo cluster.
              </Translate>
            </p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-grid">
          <div>
            <h2>
              <Translate id="homepage.cta.title" description="CTA section title">
                Ready to Get Started with Curvine?
              </Translate>
            </h2>
            <p>
              <Translate id="homepage.cta.subtitle" description="CTA section subtitle">
                Download now and experience the high-performance distributed caching filesystem that Curvine brings.
              </Translate>
            </p>
            <div className="btn-container">
              <Link to="https://github.com/CurvineIO/curvine/releases" className="btn btn-light">
                <Translate id="homepage.cta.download" description="Download button text">Download Now</Translate>
              </Link>
              <Link to="https://github.com/CurvineIO/curvine" className="btn btn-outline-light">
                <Translate id="homepage.cta.github" description="GitHub button text">View Source</Translate>
              </Link>
            </div>
          </div>
          <div className="cta-chip" aria-hidden="true">
            <span />
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default HomePage;
