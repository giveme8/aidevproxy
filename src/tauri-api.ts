/**
 * Tauri API wrapper with browser side mock fallback.
 *
 * When running inside a Tauri webview, delegates to the real `@tauri-apps/api/core`.
 * When running in a regular browser (e.g. Vite dev at http://localhost:1420),
 * returns mock responses so the UI is usable for frontend development.
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";

// Tauri 2 exposes `window.__TAURI_INTERNALS__`; Tauri 1 used `window.__TAURI__`.
// Accept either so a future v1 build still works, but the v2 global is what
// our current dependency actually sets.
const isTauri =
  typeof window !== "undefined" &&
  ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Seed-based PRNG for deterministic mock request generation
// ---------------------------------------------------------------------------
let prngSeed = 1;
function prng() {
  prngSeed = (prngSeed * 9301 + 49297) % 233280;
  return prngSeed / 233280;
}

function generateRecentRequests() {
  const tools = [
    { tool: "pip", host: "pypi.org", source: "清华源", baseSpeed: 12 },
    { tool: "npm", host: "registry.npmjs.org", source: "阿里云", baseSpeed: 8 },
    { tool: "hf", host: "huggingface.co/api", source: "官方源", baseSpeed: 3 },
    { tool: "docker", host: "registry-1.docker.io", source: "中科大", baseSpeed: 45 },
    { tool: "pip", host: "pypi.org/simple", source: "本地", baseSpeed: 95 },
    { tool: "npm", host: "registry.npmjs.org", source: "清华源", baseSpeed: 6 },
    { tool: "hf", host: "huggingface.co/models", source: "P2P", baseSpeed: 22 },
    { tool: "docker", host: "registry-1.docker.io/v2", source: "阿里云", baseSpeed: 38 },
  ];
  const now = new Date();
  return tools.map((t, i) => {
    const ms = now.getTime() - (tools.length - i) * 1200 + Math.floor(prng() * 400);
    const d = new Date(ms);
    const time = [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((x) => String(x).padStart(2, "0"))
      .join(":");
    const speed = (t.baseSpeed + (prng() - 0.5) * t.baseSpeed * 0.4).toFixed(1) + " MB/s";
    const status = prng() > 0.92 ? 403 : prng() > 0.85 ? 500 : 200;
    return { id: i + 1, time, tool: t.tool, host: t.host, mode: i === 4 ? "cache" : i === 6 ? "p2p" : "mirror", source: t.source, speed, status };
  });
}

const mockPeers = [
  { id: "p1", name: "lab-macbook-01", ip: "192.168.1.12", latency: 8, cache: "8.6 GB", online: true, lastSeen: "刚刚" },
  { id: "p2", name: "workstation-03", ip: "192.168.1.45", latency: 12, cache: "6.2 GB", online: true, lastSeen: "2 分钟前" },
  { id: "p3", name: "gpu-server-02", ip: "192.168.1.88", latency: 24, cache: "12.8 GB", online: true, lastSeen: "30 秒前" },
  { id: "p4", name: "lab-pc-04", ip: "192.168.1.67", latency: 15, cache: "3.4 GB", online: true, lastSeen: "1 分钟前" },
];

const mirrorLatency = [
  { name: "清华源", latency: 24, hitRate: 92 },
  { name: "中科大", latency: 35, hitRate: 78 },
  { name: "阿里云", latency: 52, hitRate: 62 },
  { name: "官方源", latency: 312, hitRate: 28 },
];

let mockUptimeStart = Date.now();

const mockStatus = {
  proxy: {
    running: false,
    port: 8899,
    config: {
      enable_mirror: true,
      enable_p2p: true,
      enable_cache: true,
      auto_start: false,
    },
  },
  stats: {
    total_requests: 0,
    total_bytes_saved: 0,
    total_bytes_transferred: 0,
    mirror_hits: 0,
    p2p_hits: 0,
    active_peers: 0,
    cache_size_bytes: 0,
    uptime_seconds: 0,
  },
  p2p: {
    running: false,
    active_peers: 0,
    p2p_hits: 0,
    cache_size_bytes: 0,
  },
  config: {
    port: 8899,
    enable_mirror: true,
    enable_p2p: true,
    enable_cache: true,
    auto_start: false,
  },
};

async function getLiveStats() {
  // When proxy is running, return accumulating mock data
  if (mockStatus.proxy.running) {
    const uptime = Math.floor((Date.now() - mockUptimeStart) / 1000);
    const total = 1200 + Math.floor(uptime / 2) + Math.floor(prng() * 10);
    return {
      total_requests: total,
      total_bytes_saved: 32_400_000_000 + uptime * 800_000,
      total_bytes_transferred: 72_500_000_000 + uptime * 2_400_000,
      mirror_hits: 800 + Math.floor(uptime / 3),
      p2p_hits: 140 + Math.floor(uptime / 15),
      active_peers: 4,
      cache_size_bytes: 42_800_000_000 + uptime * 200_000,
      uptime_seconds: uptime,
    };
  }
  return { ...mockStatus.stats };
}

const mockHandlers: Record<string, (args?: Record<string, unknown>) => unknown> = {
  get_proxy_status: () => mockStatus.proxy,
  get_stats: () => getLiveStats(),
  get_p2p_status: () => ({
    ...mockStatus.p2p,
    active_peers: mockStatus.p2p.running ? 4 : 0,
    cache_size_bytes: mockStatus.p2p.running ? 12_800_000_000 : 0,
  }),
  get_config: () => mockStatus.config,
  get_recent_requests: () => generateRecentRequests(),
  get_peers: () => (mockStatus.proxy.running ? mockPeers : []),
  get_mirror_latency: () => mirrorLatency,
  start_proxy: () => {
    mockStatus.proxy.running = true;
    mockUptimeStart = Date.now();
    return "Proxy started on port 8899 (mock)";
  },
  stop_proxy: () => {
    mockStatus.proxy.running = false;
    return "Proxy stopped (mock)";
  },
  start_p2p: () => {
    mockStatus.p2p.running = true;
    return "P2P network started (mock)";
  },
  stop_p2p: () => {
    mockStatus.p2p.running = false;
    return "P2P network stopped (mock)";
  },
  update_config: (args?: Record<string, unknown>) => {
    if (args && args.config) {
      const cfg = args.config as typeof mockStatus.config;
      mockStatus.config = { ...cfg };
      mockStatus.proxy.config = { ...cfg };
      mockStatus.proxy.port = cfg.port;
    }
    return "Config updated (mock)";
  },
  clear_cache: () => {
    mockStatus.stats.cache_size_bytes = 0;
    return "Cache cleared (mock)";
  },
  run_speed_test: () => ({
    download_mbps: +(125.4 + (prng() - 0.5) * 60).toFixed(1),
    upload_mbps: +(42.1 + (prng() - 0.5) * 20).toFixed(1),
    latency_ms: Math.floor(8 + prng() * 20),
  }),
  export_logs: () => "Logs exported to ~/Downloads/aidevproxy-logs.tar.gz (mock)",
  // ── Traffic ──
  get_traffic_logs: () => {
    type TrafficRow = { tool: string; host: string; path: string; source: string; size: string; latency: number; status: number; time: string; id: number; mode: string };
    const trafficRows: TrafficRow[] = [];
    const tools = [
      { tool: "pip", host: "pypi.tuna.tsinghua.edu.cn", path: "/simple/flask/", source: "清华源", size: "2.3 KB", latency: 42, status: 200 },
      { tool: "npm", host: "registry.npmmirror.com", path: "/vue/-/vue-3.4.0.tgz", source: "阿里云", size: "1.8 MB", latency: 186, status: 200 },
      { tool: "hf", host: "hf-mirror.com", path: "/bert-base-uncased/resolve/main/config.json", source: "hf-mirror", size: "0.6 KB", latency: 87, status: 200 },
      { tool: "docker", host: "docker.1ms.run", path: "/v2/library/nginx/manifests/latest", source: "清华源", size: "1.2 KB", latency: 213, status: 200 },
      { tool: "pip", host: "pypi.tuna.tsinghua.edu.cn", path: "/simple/requests/", source: "清华源", size: "1.8 KB", latency: 38, status: 200 },
      { tool: "npm", host: "registry.npmmirror.com", path: "/react/-/react-18.2.0.tgz", source: "中科大", size: "2.4 MB", latency: 234, status: 206 },
      { tool: "hf", host: "hf-mirror.com", path: "/bigscience/bloom-560m/resolve/main/pytorch_model.bin", source: "hf-mirror", size: "52.1 MB", latency: 522, status: 200 },
      { tool: "docker", host: "docker.1ms.run", path: "/v2/library/alpine/manifests/3.19", source: "阿里云", size: "0.9 KB", latency: 178, status: 200 },
      { tool: "pip", host: "mirrors.ustc.edu.cn", path: "/simple/numpy/", source: "中科大", size: "3.1 KB", latency: 45, status: 200 },
      { tool: "npm", host: "registry.npmmirror.com", path: "/lodash/-/lodash-4.17.21.tgz", source: "阿里云", size: "0.6 MB", latency: 312, status: 200 },
      { tool: "hf", host: "hf-mirror.com", path: "/gpt2/resolve/main/vocab.json", source: "hf-mirror", size: "1.0 MB", latency: 145, status: 200 },
      { tool: "docker", host: "docker.1ms.run", path: "/v2/library/python/manifests/3.12-slim", source: "清华源", size: "2.1 KB", latency: 267, status: 301 },
      { tool: "pip", host: "pypi.tuna.tsinghua.edu.cn", path: "/simple/django/", source: "清华源", size: "2.7 KB", latency: 41, status: 200 },
      { tool: "npm", host: "registry.npmmirror.com", path: "/next/-/next-14.0.0.tgz", source: "智能代理", size: "5.2 MB", latency: 456, status: 404 },
      { tool: "hf", host: "hf-mirror.com", path: "/stabilityai/sd-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors", source: "hf-mirror", size: "6.9 GB", latency: 1823, status: 500 },
      { tool: "docker", host: "docker.1ms.run", path: "/v2/bitnami/redis/manifests/7.2", source: "阿里云", size: "1.5 KB", latency: 198, status: 200 },
    ];
    const now = new Date();
    return trafficRows.concat(tools.map((t, i) => {
      const ms = now.getTime() - (tools.length - i) * 1500 + Math.floor(prng() * 300);
      const d = new Date(ms);
      const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, "0")).join(":") + "." + String(d.getMilliseconds()).padStart(3, "0");
      return { ...t, time, id: i + 1, mode: t.tool === "hf" ? "镜像" : t.source === "智能代理" ? "智能代理" : "代理" };
    }));
  },
  // ── Cache ──
  get_cache_entries: () => {
    const entries = [
      { name: "Mixtral-8x7B-Instruct-v0.1", type: "模型", source: "HuggingFace", size_bytes: 28_730_000_000, last_used: "2025-05-10 14:32", sha256: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0", status: "活跃" },
      { name: "torch-2.1.0+cu118", type: "包", source: "PyPI", size_bytes: 2_410_000_000, last_used: "2025-05-10 12:15", sha256: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1", status: "活跃" },
      { name: "@anthropic-ai/sdk-0.45.0", type: "包", source: "npm", size_bytes: 342_000_000, last_used: "2025-05-10 10:48", sha256: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2", status: "活跃" },
      { name: "nvidia/cuda:12.1-runtime", type: "镜像层", source: "Docker Hub", size_bytes: 1_870_000_000, last_used: "2025-05-09 22:10", sha256: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3", status: "活跃" },
      { name: "typescript-5.3.3", type: "包", source: "npm", size_bytes: 64_500_000, last_used: "2025-05-09 16:22", sha256: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4", status: "活跃" },
      { name: "transformers-4.36.0", type: "包", source: "PyPI", size_bytes: 890_000_000, last_used: "2025-05-08 09:55", sha256: "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5", status: "过期" },
      { name: "node:20-alpine", type: "镜像层", source: "Docker Hub", size_bytes: 118_000_000, last_used: "2025-05-07 18:30", sha256: "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6", status: "活跃" },
      { name: "Llama-2-7b-chat-hf", type: "模型", source: "HuggingFace", size_bytes: 13_500_000_000, last_used: "2025-05-06 11:40", sha256: "b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7", status: "待清理" },
    ];
    return entries;
  },
  get_cache_config: () => ({
    max_size_gb: 100,
    auto_clean: true,
    clean_policy: "LRU",
    clean_threshold_pct: 90,
    min_retention_days: 7,
    cache_dir: "~/Library/Caches/aidevproxy/",
  }),
  update_cache_config: (args?: Record<string, unknown>) => `Cache config updated (mock): ${JSON.stringify(args?.config ?? {})}`,
  reindex_cache: () => "Cache reindexed (mock)",
  open_cache_dir: () => "Opening cache directory (mock)",
  // ── Nodes / Peers ──
  get_nodes: () => [
    { id: "n1", name: "lab-macbook-01", ip: "192.168.1.101", latency: 28, cache: "8.6 GB", online: true, device: "laptop", lastSeen: "刚刚", trusted: true, os: "macOS 15.2", version: "v2.3.1", uptime: "3d 12h", bandwidth: "1 Gbps" },
    { id: "n2", name: "workstation-03", ip: "192.168.1.103", latency: 35, cache: "6.2 GB", online: true, device: "desktop", lastSeen: "2 分钟前", trusted: true, os: "Ubuntu 24.04", version: "v2.3.0", uptime: "7d 4h", bandwidth: "1 Gbps" },
    { id: "n3", name: "gpu-server-02", ip: "192.168.1.102", latency: 52, cache: "12.8 GB", online: true, device: "server", lastSeen: "30 秒前", trusted: false, os: "Ubuntu 22.04", version: "v2.2.8", uptime: "30d 2h", bandwidth: "10 Gbps" },
    { id: "n4", name: "lab-pc-04", ip: "192.168.1.104", latency: 24, cache: "3.4 GB", online: true, device: "desktop", lastSeen: "1 分钟前", trusted: true, os: "Windows 11", version: "v2.3.1", uptime: "1d 8h", bandwidth: "1 Gbps" },
    { id: "n5", name: "nas-storage-01", ip: "192.168.1.105", latency: 68, cache: "1.1 GB", online: true, device: "server", lastSeen: "5 分钟前", trusted: false, os: "Debian 12", version: "v2.1.5", uptime: "180d 6h", bandwidth: "2.5 Gbps" },
    { id: "n6", name: "android-phone", ip: "192.168.1.106", latency: 112, cache: "120 MB", online: false, device: "phone", lastSeen: "2 小时前", trusted: false, os: "Android 15", version: "v1.9.2", uptime: "12h 30m", bandwidth: "WiFi 6" },
  ],
  scan_nodes: () => ({ found: 6, new: 1, message: "发现 6 个节点，其中 1 个为新节点 (mock)" }),
  add_trusted_node: (args?: Record<string, unknown>) => `Node ${args?.node_id ?? "unknown"} marked as trusted (mock)`,
  remove_node: (args?: Record<string, unknown>) => `Node ${args?.node_id ?? "unknown"} removed (mock)`,
  // ── Mirrors ──
  get_mirrors: () => [
    { id: "m1", name: "清华大学源", url: "https://pypi.tuna.tsinghua.edu.cn/simple", ecosystem: "pypi", latency: 24, healthy: true, health_text: "健康", priority: 1, enabled: true, last_test: "30 秒前", protocol: "HTTPS", recommended: true, fallback_enabled: true, max_failures: 3, health_check_enabled: true, check_interval: "30秒" },
    { id: "m2", name: "阿里云源", url: "https://mirrors.aliyun.com/pypi/simple", ecosystem: "pypi", latency: 35, healthy: true, health_text: "健康", priority: 2, enabled: true, last_test: "1 分钟前", protocol: "HTTPS", fallback_enabled: true, max_failures: 3, health_check_enabled: true, check_interval: "30秒" },
    { id: "m3", name: "腾讯云源", url: "https://mirrors.cloud.tencent.com/pypi/simple", ecosystem: "pypi", latency: 41, healthy: true, health_text: "健康", priority: 3, enabled: true, last_test: "2 分钟前", protocol: "HTTPS", fallback_enabled: true, max_failures: 3, health_check_enabled: true, check_interval: "30秒" },
    { id: "m4", name: "华为云源", url: "https://mirrors.huaweicloud.com/repository/pypi", ecosystem: "pypi", latency: 52, healthy: true, health_text: "健康", priority: 4, enabled: true, last_test: "45 秒前", protocol: "HTTPS", fallback_enabled: true, max_failures: 3, health_check_enabled: true, check_interval: "30秒" },
    { id: "m5", name: "中科大源", url: "https://pypi.mirrors.ustc.edu.cn/simple", ecosystem: "pypi", latency: 68, healthy: true, health_text: "较慢", priority: 5, enabled: true, last_test: "3 分钟前", protocol: "HTTPS", fallback_enabled: false, max_failures: 5, health_check_enabled: true, check_interval: "1分钟" },
    { id: "m6", name: "豆瓣源", url: "https://pypi.douban.com/simple", ecosystem: "pypi", latency: 89, healthy: false, health_text: "较差", priority: 6, enabled: false, last_test: "10 分钟前", protocol: "HTTP", fallback_enabled: false, max_failures: 2, health_check_enabled: false, check_interval: "5分钟" },
    { id: "m7", name: "官方源", url: "https://pypi.org/simple", ecosystem: "pypi", latency: 245, healthy: false, health_text: "不可用", priority: 7, enabled: false, last_test: "1 小时前", protocol: "HTTPS", fallback_enabled: false, max_failures: 1, health_check_enabled: false, check_interval: "5分钟" },
    { id: "m8", name: "npm 淘宝源", url: "https://registry.npmmirror.com", ecosystem: "npm", latency: 28, healthy: true, health_text: "健康", priority: 1, enabled: true, last_test: "30 秒前", protocol: "HTTPS", recommended: true, fallback_enabled: true, max_failures: 3, health_check_enabled: true, check_interval: "30秒" },
    { id: "m9", name: "HuggingFace 镜像", url: "https://hf-mirror.com", ecosystem: "hf", latency: 35, healthy: true, health_text: "健康", priority: 1, enabled: true, last_test: "1 分钟前", protocol: "HTTPS", recommended: true, fallback_enabled: true, max_failures: 3, health_check_enabled: true, check_interval: "1分钟" },
    { id: "m10", name: "Docker 1ms 镜像", url: "https://docker.1ms.run", ecosystem: "docker", latency: 42, healthy: true, health_text: "健康", priority: 1, enabled: true, last_test: "2 分钟前", protocol: "HTTPS", recommended: true, fallback_enabled: true, max_failures: 3, health_check_enabled: true, check_interval: "1分钟" },
  ],
  add_mirror: (args?: Record<string, unknown>) => {
    const inner = (args?.args as Record<string, unknown>) ?? args ?? {};
    return `Mirror ${inner.name ?? "unknown"} added (mock)`;
  },
  remove_mirror: (args?: Record<string, unknown>) => `Mirror ${args?.id ?? "unknown"} removed (mock)`,
  update_mirror: (args?: Record<string, unknown>) => {
    const inner = (args?.args as Record<string, unknown>) ?? args ?? {};
    return `Mirror ${inner.id ?? "unknown"} updated (mock)`;
  },
  test_mirror_speed: () => "Mirror speed test complete (mock)",
  probe_mirrors: async (args?: Record<string, unknown>) => {
    // Mock implementation: keep the supplied subset visible, but jitter latency
    // so the UI can confirm a refresh actually changed something.
    const ids = (args?.ids as string[]) ?? [];
    await new Promise((r) => setTimeout(r, 350 + prng() * 300));
    const all = mockHandlers.get_mirrors() as Array<Record<string, unknown>>;
    return all
      .filter((m) => ids.includes(m.id as string))
      .map((m) => {
        const base = (m.latency as number) || 50;
        const jitter = Math.round((prng() - 0.5) * 20);
        const latency = Math.max(8, base + jitter);
        const healthy = latency < 200;
        const time = new Date();
        const last_test = [time.getHours(), time.getMinutes(), time.getSeconds()]
          .map((x) => String(x).padStart(2, "0"))
          .join(":");
        return {
          ...m,
          latency,
          healthy,
          health_text: latency === 0 ? "不可用" : latency < 50 ? "健康" : latency < 100 ? "较慢" : "较差",
          last_test,
        };
      });
  },
  // ── Rules ──
  get_rules: () => [
    { id: "r1", name: "PyPI 清华镜像", pattern: "pypi.org/**", action: "镜像加速", priority: 1, enabled: true, hits: 12580, action_color: "green" },
    { id: "r2", name: "npm 阿里云镜像", pattern: "registry.npmjs.org/**", action: "镜像加速", priority: 2, enabled: true, hits: 8932, action_color: "green" },
    { id: "r3", name: "HuggingFace 代理", pattern: "huggingface.co/**", action: "智能代理", priority: 3, enabled: true, hits: 4521, action_color: "blue" },
    { id: "r4", name: "Docker Hub 代理", pattern: "registry-1.docker.io/**", action: "代理转发", priority: 4, enabled: true, hits: 3280, action_color: "purple" },
    { id: "r5", name: "Google API 直连", pattern: "*.googleapis.com/**", action: "直接连接", priority: 5, enabled: false, hits: 0, action_color: "yellow" },
    { id: "r6", name: "内部服务绕过", pattern: "*.internal.corp/**", action: "绕过代理", priority: 6, enabled: true, hits: 896, action_color: "orange" },
    { id: "r7", name: "Conda 镜像", pattern: "conda.anaconda.org/**", action: "镜像加速", priority: 7, enabled: true, hits: 2150, action_color: "green" },
  ],
  add_rule: (args?: Record<string, unknown>) => {
    const inner = (args?.args as Record<string, unknown>) ?? args ?? {};
    return `Rule ${inner.name ?? "unknown"} added (mock)`;
  },
  update_rule: (args?: Record<string, unknown>) => {
    const inner = (args?.args as Record<string, unknown>) ?? args ?? {};
    return `Rule ${inner.id ?? "unknown"} updated (mock)`;
  },
  remove_rule: (args?: Record<string, unknown>) => `Rule ${args?.id ?? "unknown"} removed (mock)`,
  toggle_rule: (args?: Record<string, unknown>) => `Rule ${args?.id ?? "unknown"} toggled (mock)`,
  reorder_rules: () => "Rules reordered (mock)",
  // ── Settings ──
  get_settings: () => ({
    port: "7890", startup: true, sys_proxy: true, theme: "深色", lang: "简体中文",
    min_tray: false, tray_action: "显示主窗口",
    cache_dir: "/Users/Shared/AIProxy/cache", cache_max: 50, auto_clean: true,
    clean_policy: "LRU (最近最少使用)", keep_days: "7", low_disk: "可用空间小于 10GB",
    p2p: true, lan_discovery: true, device_name: "lab-macbook-01", same_subnet: true,
    max_conn: "200", up_limit: "10", up_unit: "MB/s", down_limit: "0", down_unit: "MB/s",
    sha256: true, cert_verify: "严格校验", allow_insecure: false, log_desensitize: true,
    desens_level: "标准", acl: "白名单模式", allowed_ips: "192.168.1.0/24,10.0.0.0/8",
    concurrent: "1024", idle_timeout: "60", dns: "系统 DNS", tcp_opt: "启用",
    udp_relay: true, ipv6: false,
  }),
  save_settings: (args?: Record<string, unknown>) => {
    if (args?.settings) Object.assign(mockStatus.config, args.settings as Record<string, unknown>);
    return "Settings saved (mock)";
  },
  reset_settings: () => "Settings reset to defaults (mock)",
};

// ---------------------------------------------------------------------------
// Public invoke
// ---------------------------------------------------------------------------

/**
 * Mirrors `invoke` from `@tauri-apps/api/core`.
 * Falls back to mock handlers when running in a regular browser.
 */
export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    return tauriInvoke<T>(cmd, args);
  }

  // Browser fallback
  const handler = mockHandlers[cmd];
  if (!handler) {
    console.warn(`[tauri-api mock] No mock handler for command: ${cmd}`);
    return undefined as unknown as T;
  }

  // Simulate a small network delay for a more realistic dev experience
  await new Promise((r) => setTimeout(r, 100));
  return handler(args) as T;
}

/**
 * Re-export the isTauri flag so components can conditionally render
 * Tauri-only UI (e.g. "open in Tauri app" banner).
 */
export { isTauri };
