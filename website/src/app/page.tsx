import ThemeToggle from "./components/ThemeToggle";
import Terminal from "./components/Terminal";

/* ─── Shared section wrapper ─── */
function Section({
  children,
  style,
  id,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`r-section ${className ?? ""}`} style={style}>
      {children}
    </section>
  );
}

/* ─── Section label ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--accent)",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        borderRadius: 14,
        padding: "32px 28px",
        border: "1px solid var(--rule)",
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 16 }}>{icon}</div>
      <h3
        style={{
          fontFamily: "var(--font-noto-serif-sc), serif",
          fontSize: 20,
          fontWeight: 600,
          margin: "0 0 10px",
          lineHeight: 1.3,
          color: "var(--ink)",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--ink-dim)",
          margin: 0,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

/* ─── Service card ─── */
function ServiceCard({
  name,
  desc,
  icon,
}: {
  name: string;
  desc: string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-raised)",
        borderRadius: 12,
        padding: "24px 22px",
        border: "1px solid var(--rule)",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
      <div>
        <h4
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 15,
            fontWeight: 500,
            color: "var(--ink)",
            margin: "0 0 6px",
          }}
        >
          {name}
        </h4>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--ink-dim)",
            margin: 0,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── FAQ item ─── */
function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div
      style={{
        padding: "28px 0",
        borderTop: "1px solid var(--rule)",
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-noto-serif-sc), serif",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink)",
          margin: "0 0 12px",
          lineHeight: 1.35,
        }}
      >
        {q}
      </h3>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--ink-dim)",
          margin: 0,
        }}
      >
        {a}
      </p>
    </div>
  );
}

/* ─── Responsive heading ─── */
function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: "var(--font-noto-serif-sc), serif",
        fontWeight: 700,
        lineHeight: 1.12,
        letterSpacing: "-0.02em",
        margin: "0 0 24px",
        fontSize: "clamp(28px, 5vw, 52px)",
      }}
    >
      {children}
    </h1>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-noto-serif-sc), serif",
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
        fontSize: "clamp(24px, 3.5vw, 38px)",
        margin: "0 0 40px",
      }}
    >
      {children}
    </h2>
  );
}

/* ────────────────────────────────────
   Page
   ──────────────────────────────────── */
export default function Page() {
  return (
    <div
      style={{
        background: "var(--bg)",
        color: "var(--ink)",
        minHeight: "100vh",
        transition:
          "background var(--transition-speed), color var(--transition-speed)",
      }}
    >
      {/* ── HEADER ── */}
      <header className="r-header" style={{}}>
        <div
          style={{
            fontFamily: "var(--font-noto-serif-sc), serif",
            fontSize: "clamp(20px, 3vw, 24px)",
            fontWeight: 700,
            fontStyle: "italic",
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}
        >
          AIDevProxy
        </div>
        <span
          style={{
            fontSize: 11,
            padding: "4px 12px",
            borderRadius: 999,
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          v0.1 · alpha
        </span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 28 }}>
          <nav className="r-nav" style={{ marginLeft: 0 }}>
            <a href="#features" style={{ textDecoration: "none" }}>
              特性
            </a>
            <a href="#services" style={{ textDecoration: "none" }}>
              支持服务
            </a>
            <a href="#faq" style={{ textDecoration: "none" }}>
              FAQ
            </a>
            <a
              href="https://github.com/giveme8/aidevproxy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              GitHub ↗
            </a>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {/* ── HERO ── */}
      <Section>
        <div className="r-hero">
          <div className="r-hero-text">
            <H1>
              让 AI 开发环境
              <br />
              跑得
              <em
                style={{
                  fontStyle: "italic",
                  color: "var(--accent)",
                }}
              >
                飞快
              </em>
            </H1>
            <p
              style={{
                fontSize: "clamp(15px, 1.8vw, 17px)",
                lineHeight: 1.65,
                color: "var(--ink-dim)",
                margin: "0 0 32px",
                maxWidth: 480,
              }}
            >
              本地 AI 开发代理。拦截 pip / npm / HuggingFace
              请求，智能镜像加速 + P2P 局域网分发 + 本地缓存。
              一次配置 HTTP_PROXY，覆盖所有工具。
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="https://github.com/giveme8/aidevproxy"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "var(--ink)",
                  color: "var(--bg)",
                  textDecoration: "none",
                  padding: "14px 24px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 500,
                  display: "inline-block",
                }}
              >
                开始使用 →
              </a>
              <a
                href="#features"
                style={{
                  background: "transparent",
                  color: "var(--ink)",
                  border: "1px solid var(--rule)",
                  textDecoration: "none",
                  padding: "13px 22px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 500,
                  display: "inline-block",
                }}
              >
                了解更多
              </a>
            </div>
          </div>

          <div className="r-hero-terminal">
            <Terminal />
          </div>
        </div>
      </Section>

      {/* ── ONE-LINER ── */}
      <Section style={{ paddingTop: 20, paddingBottom: 60 }}>
        <div
          style={{
            background: "var(--bg-raised)",
            borderRadius: 16,
            padding: "clamp(24px, 4vw, 40px) clamp(24px, 5vw, 48px)",
            border: "1px solid var(--rule)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-noto-serif-sc), serif",
              fontSize: "clamp(17px, 2.2vw, 22px)",
              fontWeight: 500,
              lineHeight: 1.5,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            一句话说清：AIDevProxy 是一个
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>
              {" "}
              本地 HTTP 代理{" "}
            </span>
            ，自动识别 pip / npm / HuggingFace 流量，帮你做
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>
              {" "}
              镜像加速 + P2P 分发 + 本地缓存{" "}
            </span>
            。
            <br />
            设一次
            <code
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                background: "var(--rule)",
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: "0.9em",
              }}
            >
              HTTP_PROXY
            </code>
            ，所有工具自动受益。
          </p>
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Section id="features">
        <SectionLabel>核心能力</SectionLabel>
        <H2>四个模块，一个代理</H2>
        <div className="r-features">
          <FeatureCard
            icon="🪝"
            title="请求拦截器"
            desc="透明拦截所有 HTTP 请求，按域名和路径匹配规则，自动判断应该走镜像、走 P2P、还是直连。支持 pip、npm、HuggingFace、Conda 等 10+ 服务。"
          />
          <FeatureCard
            icon="🧭"
            title="智能镜像"
            desc="内置国内高校镜像（清华、中科大、阿里云等），对每个请求自动选择延迟最低的镜像源。比手动配 pip index-url + npm registry 快，而且不会配错。"
          />
          <FeatureCard
            icon="🌐"
            title="P2P 分发"
            desc="基于 libp2p 的 DHT + mDNS 局域网自动发现。同一个团队/实验室的机器自动组成对等网络，同事下载过的包直接从局域网拉取，无需再次走外网。"
          />
          <FeatureCard
            icon="💾"
            title="本地缓存"
            desc="所有下载的内容按 SHA-256 索引、去重存储。同一份 8GB 的模型权重，不管被多少工具引用，磁盘上只占一份。支持设置大小上限和一键清理。"
          />
        </div>
      </Section>

      {/* ── SERVICES ── */}
      <Section id="services" style={{ paddingTop: 40 }}>
        <SectionLabel>支持这些服务</SectionLabel>
        <H2>开箱即用，覆盖 AI 开发全流程</H2>
        <div className="r-services">
          <ServiceCard
            name="PyPI / pip"
            desc="自动镜像加速，pip install 不再卡顿。"
            icon="📦"
          />
          <ServiceCard
            name="npm / yarn"
            desc="registry.npmjs.org → 国内镜像。"
            icon="🔷"
          />
          <ServiceCard
            name="HuggingFace Hub"
            desc="模型 & 数据集下载走镜像，无需 HF_ENDPOINT。"
            icon="🤗"
          />
          <ServiceCard
            name="Conda / Anaconda"
            desc="conda install 自动选最快的 channel。"
            icon="🐍"
          />
          <ServiceCard
            name="crates.io (Rust)"
            desc="cargo 依赖自动镜像加速。"
            icon="🦀"
          />
          <ServiceCard
            name="Docker Hub"
            desc="docker pull 走代理，避免拉取超时。"
            icon="🐳"
          />
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <SectionLabel>常见问题</SectionLabel>
        <h2
          style={{
            fontFamily: "var(--font-noto-serif-sc), serif",
            fontSize: "clamp(24px, 3.5vw, 38px)",
            fontWeight: 700,
            margin: "0 0 28px",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          Q & A
        </h2>
        <div style={{ borderBottom: "1px solid var(--rule)" }}>
          <FAQItem
            q="它和直接配置 pip 镜像、HuggingFace HF_ENDPOINT 有什么不同？"
            a="一次设置 HTTP_PROXY 就覆盖所有工具，你不必记 pip 的 index-url、conda 的 channel、HuggingFace 的 mirror 各自怎么写。同时 P2P 与本地缓存能避免「同事下完我再下」的重复消耗 — 这些是单纯换镜像源拿不到的。"
          />
          <FAQItem
            q="P2P 是否需要公网穿透？会不会有数据安全问题？"
            a="目前默认只在局域网内通过 mDNS 发现对等节点，不依赖公网穿透。所有共享内容都按 SHA-256 校验，确保和上游一致。共享的是已经从公开镜像下载的开源包，本身即公开内容。"
          />
          <FAQItem
            q="支持 HTTPS 流量吗？会破坏证书吗？"
            a="支持。AIDevProxy 用 HTTP CONNECT 隧道转发 HTTPS — 不解密、不替换证书、不做中间人，只在握手前判断目标主机是否需要重写。"
          />
          <FAQItem
            q="缓存会不会无限增长？"
            a="缓存目录在 Settings 里有大小上限和一键清理。SHA-256 索引天然去重 — 同一个 8GB 模型，不管被多少个工具引用，都只占一份磁盘。"
          />
          <FAQItem
            q="开源协议？我可以二次发行吗？"
            a="MIT License。fork、改名、商用都可以；只是希望你把改进 PR 回上游让大家受益。"
          />
        </div>
      </Section>

      {/* ── OPEN SOURCE ── */}
      <Section style={{ paddingTop: 40, paddingBottom: 96 }}>
        <div
          style={{
            background: "var(--bg-raised)",
            borderRadius: 18,
            padding: "clamp(32px, 5vw, 56px) clamp(24px, 5vw, 48px)",
            border: "1px solid var(--rule)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 20,
            }}
          >
            开源项目 · giveme8/aidevproxy
          </div>

          <div className="r-open-source-inner">
            <h2 className="r-open-source-heading">
              由{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                Rust + libp2p
              </em>{" "}
              构建。
              <br />
              代码紧凑，模块边界清晰。
            </h2>
            <div className="r-open-source-stats">
              {[
                ["~26", "core files"],
                ["9", "tauri commands"],
                ["MIT", "license"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div
                    style={{
                      fontFamily: "var(--font-noto-serif-sc), serif",
                      fontSize: "clamp(28px, 3.5vw, 40px)",
                      color: "var(--ink)",
                      lineHeight: 1,
                    }}
                  >
                    {n}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ink-faint)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginTop: 6,
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 36,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <a
              href="https://github.com/giveme8/aidevproxy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "var(--ink)",
                color: "var(--bg)",
                border: "none",
                padding: "12px 18px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "var(--font-geist), sans-serif",
                fontSize: 14,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Star on GitHub →
            </a>
            <a
              href="https://github.com/giveme8/aidevproxy#readme"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--rule)",
                padding: "11px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "var(--font-geist), sans-serif",
                fontSize: 14,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              阅读 README
            </a>
          </div>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="r-footer">
        <span
          style={{
            fontFamily: "var(--font-noto-serif-sc), serif",
            fontSize: 17,
            color: "var(--ink)",
            fontStyle: "italic",
          }}
        >
          AIDevProxy
        </span>
        <span style={{ whiteSpace: "nowrap" }}>© 2026 · Built in Rust</span>
        <span
          className="r-footer-links"
          style={{ marginLeft: "auto", display: "flex", gap: 24 }}
        >
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
            Docs
          </a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
            Changelog
          </a>
          <a
            href="https://github.com/giveme8/aidevproxy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            GitHub
          </a>
        </span>
      </footer>
    </div>
  );
}
