# AIDevProxy 项目总结

## 一句话介绍

**AIDevProxy** 是一款零配置的 AI 开发环境加速代理工具，以桌面应用形态运行，自动将 pip、conda、HuggingFace、npm、Docker 等 AI/ML 软件包的下载请求路由到国内高速镜像，并通过 P2P 网络和本地缓存进一步加速重复下载。

---

## 产品定位

为 AI 开发者打造的「网络加速层」。用户无需手动配置每个工具（pip、conda、HuggingFace CLI 等）的镜像源，只需启动代理并设置系统环境变量，所有流量自动拦截和重定向。

---

## 核心技术特性

### 1. 智能镜像路由

后端维护了一张「已知上游主机 → 国内镜像」的映射表（`interceptor.rs`），代理在收到 HTTP/CONNECT 请求时自动匹配并重写目标 URL：

| 上游 | 转发目标 |
|---|---|
| `pypi.org` | 清华 / 阿里云 / 中科大 / 腾讯 镜像 |
| `huggingface.co` / `cdn-lfs.huggingface.co` | `hf-mirror.com` |
| `registry.npmjs.org` | `npmmirror.com` |
| `repo.anaconda.com` / `conda.anaconda.org` | 清华 conda 镜像 |
| `registry-1.docker.io` | USTC Docker 镜像 |

镜像系统（`mirror.rs`）还维护了每个上游的多个备选镜像，支持延迟探测，自动选择最快的可用镜像。

### 2. P2P 网络加速

基于 **libp2p** 构建的去中心化 P2P 网络：

- **Kademlia DHT** — 分布式哈希表，用于在节点间查找缓存内容
- **mDNS** — 局域网自动发现，无需手动配置对等节点
- **Identify 协议** — 交换节点元信息

同一局域网内的 AIDevProxy 实例可共享本地缓存的软件包。当本地缓存未命中时，通过 DHT 向其他节点请求，避免重复从外网下载。

### 3. 本地内容缓存

基于 SHA-256 的内容寻址缓存（`cache.rs`）：

- 下载的包按 SHA-256 哈希索引存储于系统缓存目录
- 相同内容只存一份，去重天然支持
- 缓存会通过 P2P 网络的 DHT 向其他节点宣告，供局域网内共享

---

## 技术架构

```
┌─────────────────────────────────────────┐
│               React 18 前端               │
│   Dashboard · P2PStatus · Settings       │
│   (TypeScript + Vite + Tauri API v2)     │
├─────────────────────────────────────────┤
│            Tauri 2 IPC Bridge             │
│              9 个 Tauri 命令              │
├────────────┬────────────────────────────┤
│  Proxy 模块  │       P2P 模块             │
│  ┌────────┐  │  ┌─────────────────────┐  │
│  │ server  │  │  │  libp2p Swarm        │  │
│  │(TCP代理) │  │  │  (Kademlia/mDNS)    │  │
│  ├────────┤  │  └─────────────────────┘  │
│  │intercept│  │                          │
│  │(URL匹配) │  │                          │
│  ├────────┤  │                          │
│  │ mirror  │  │                          │
│  │(镜像注册) │  │                          │
│  ├────────┤  │                          │
│  │ cache   │  │                          │
│  │(内容缓存) │  │                          │
│  └────────┘  │                          │
├────────────┴────────────────────────────┤
│            Rust (Tokio 异步运行时)         │
│          macOS / Windows / Linux         │
└─────────────────────────────────────────┘
```

### 前端（React 18 + TypeScript）

- **Dashboard** — 代理启停控制 + 8 项流量统计（总请求、传输/节省流量、镜像/P2P 命中数、缓存大小、活跃节点、运行时间）
- **P2PStatus** — P2P 网络连接状态与启停
- **Settings** — 端口、功能开关配置 + 内置使用说明（支持的服务列表、环境变量示例）
- **tauri-api.ts** — 封装 `@tauri-apps/api`，附带浏览器端 mock 回退，支持脱离 Tauri 进行前端开发

### 后端（Rust + Tauri 2）

- **Proxy Server** — 基于 Tokio 的 TCP 代理，支持 HTTP 代理和 HTTPS CONNECT 隧道，优雅关闭通过 watch channel 实现
- **Interceptor** — 零拷贝 URL 匹配引擎，解析 HTTP 请求首行，匹配已知主机和路径前缀，生成镜像 URL
- **Mirror Registry** — 多镜像延迟探测与最快镜像选择，每个上游支持多个备选镜像
- **Package Cache** — SHA-256 去重存储，文件按哈希命名，支持基于内容的 P2P 共享
- **P2P Network** — libp2p Swarm 全生命周期管理，DHT 内容查询/发布，mDNS 局域网节点发现
- **9 个 Tauri Commands** — `start_proxy / stop_proxy / get_proxy_status / get_stats / start_p2p / stop_p2p / get_p2p_status / update_config / get_config`

---

## 测试覆盖

| 层级 | 工具 | 覆盖范围 |
|---|---|---|
| Rust 单元测试 | `cargo test` | interceptor (URL 匹配 10 个场景)、mirror (镜像选择)、cache (存储/获取/去重/清空) |
| Rust 集成测试 | `cargo test` | AppState 初始化、ProxyConfig/ProxyStats 序列化 |
| 前端组件测试 | Vitest | Dashboard、P2PStatus、Settings 渲染与交互 |
| E2E 测试 | Playwright | 代理启停、P2P 启停、设置保存、页面导航、统计面板 |

---

## 技术栈依赖

**Rust 核心依赖**：tokio (异步运行时) · hyper + reqwest (HTTP) · libp2p (P2P 网络) · parking_lot (高效锁) · sha2 (内容哈希) · serde_json (序列化)

**前端依赖**：React 18 · Vite 5 · TypeScript 5 · @tauri-apps/api v2

**开发工具**：Vitest · Playwright · Tauri CLI v2

---

## 使用场景

1. 在 AI 开发环境中设置 `HTTP_PROXY` / `HTTPS_PROXY` 指向 AIDevProxy
2. 后续所有 pip install、conda install、HuggingFace 模型下载、npm install、docker pull 等流量自动加速
3. 团队在局域网内部署多实例，通过 P2P 共享缓存，避免重复下载大模型文件（动辄数 GB）

---

## 项目规模

- 约 **26 个关键源文件**，代码紧凑、模块边界清晰
- Rust 后端：7 个模块文件 + 1 个集成测试文件
- React 前端：4 个 TypeScript 文件 + 3 个组件测试文件 + 1 个 E2E 测试文件
- 版本号：**v0.1.0**（早期阶段，核心功能已就绪）

---

## 官网结构建议

1. **Hero**：一句话价值主张 + 下载按钮
2. **特性亮点**：智能镜像 / P2P 加速 / 本地缓存，三项各自配图标
3. **支持服务**：pip / conda / HuggingFace / npm / Docker 的 logo 墙
4. **快速开始**：下载 → 启动 → 设环境变量，三步完成
5. **架构图**：可视化架构图示
6. **技术栈**：Rust + React + libp2p 的简洁展示
