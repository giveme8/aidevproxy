import { useState, useEffect } from "react";
import { invoke } from "../tauri-api";

interface ProxyStatus {
  running: boolean;
  port: number;
  config: {
    enable_mirror: boolean;
    enable_p2p: boolean;
    enable_cache: boolean;
    auto_start: boolean;
  };
}

interface ProxyStats {
  total_requests: number;
  total_bytes_saved: number;
  total_bytes_transferred: number;
  mirror_hits: number;
  p2p_hits: number;
  active_peers: number;
  cache_size_bytes: number;
  uptime_seconds: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ProxyControl() {
  const [status, setStatus] = useState<ProxyStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const s = await invoke<ProxyStatus>("get_proxy_status");
      setStatus(s);
    } catch (_e) {
      // fallback silently on fetch failure
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (status?.running) {
        await invoke("stop_proxy");
      } else {
        await invoke("start_proxy");
      }
      await fetchStatus();
    } catch (_e) {
      console.error(_e);
    }
    setLoading(false);
  };

  const running = status?.running ?? false;
  const port = status?.port ?? 8899;

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <div>
          <div style={styles.label}>代理状态</div>
          <div style={styles.statusRow}>
            <span
              style={{
                ...styles.dot,
                background: running ? "#22c55e" : "#ef4444",
              }}
            />
            <span style={styles.statusText}>
              {running ? "运行中" : "已停止"}
            </span>
            <span style={styles.portText}>
              {running ? `端口: ${port}` : ""}
            </span>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            ...styles.toggleBtn,
            background: running ? "#ef4444" : "#22c55e",
          }}
        >
          {loading ? "..." : running ? "停止代理" : "启动代理"}
        </button>
      </div>
      {running && (
        <div style={styles.setupHint}>
          <code style={styles.code}>
            export HTTP_PROXY=http://127.0.0.1:{port}
          </code>
          <code style={styles.code}>
            export HTTPS_PROXY=http://127.0.0.1:{port}
          </code>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<ProxyStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const s = await invoke<ProxyStats>("get_stats");
        setStats(s);
      } catch (_e) {
        // ignore
      }
    };
    // Periodically persist cumulative stats so they survive restarts.
    const flushStats = async () => {
      try {
        await invoke("flush_stats");
      } catch (_e) {
        // ignore
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    const flushInterval = setInterval(flushStats, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(flushInterval);
    };
  }, []);

  if (!stats) return null;

  const cards = [
    { label: "总请求", value: stats.total_requests.toLocaleString() },
    { label: "传输流量", value: formatBytes(stats.total_bytes_transferred) },
    { label: "节省流量", value: formatBytes(stats.total_bytes_saved) },
    { label: "镜像命中", value: stats.mirror_hits.toLocaleString() },
    { label: "P2P 命中", value: stats.p2p_hits.toLocaleString() },
    { label: "缓存大小", value: formatBytes(stats.cache_size_bytes) },
    { label: "活跃节点", value: stats.active_peers.toString() },
    { label: "运行时间", value: formatDuration(stats.uptime_seconds) },
  ];

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>📊 流量统计</h3>
      <div style={styles.grid}>
        {cards.map((c) => (
          <div key={c.label} style={styles.statItem}>
            <div style={styles.statValue}>{c.value}</div>
            <div style={styles.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#16181d",
    border: "1px solid #2a2d35",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "16px",
  },
  cardTitle: {
    margin: "0 0 16px 0",
    fontSize: "15px",
    fontWeight: 600,
    color: "#fff",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "12px",
    color: "#9ba1b0",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    display: "inline-block",
  },
  statusText: {
    fontSize: "16px",
    fontWeight: 600,
  },
  portText: {
    fontSize: "13px",
    color: "#9ba1b0",
  },
  toggleBtn: {
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  setupHint: {
    marginTop: "16px",
    padding: "12px",
    background: "#0f1117",
    borderRadius: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  code: {
    fontSize: "12px",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    color: "#22c55e",
    background: "transparent",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "12px",
  },
  statItem: {
    padding: "12px",
    background: "#0f1117",
    borderRadius: "8px",
    textAlign: "center",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#1a6ff5",
  },
  statLabel: {
    fontSize: "11px",
    color: "#9ba1b0",
    marginTop: "4px",
  },
};

