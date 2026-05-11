import { useState, useEffect } from "react";
import { invoke } from "../tauri-api";

interface P2PStatusData {
  running: boolean;
  active_peers: number;
  p2p_hits: number;
  cache_size_bytes: number;
}

export default function P2PStatus() {
  const [status, setStatus] = useState<P2PStatusData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const s = await invoke<P2PStatusData>("get_p2p_status");
      setStatus(s);
    } catch (_e) {
      // P2P might not be active
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (status?.running) {
        await invoke("stop_p2p");
      } else {
        await invoke("start_p2p");
      }
      await fetchStatus();
    } catch (_e) {
      console.error(_e);
    }
    setLoading(false);
  };

  const running = status?.running ?? false;

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <div>
          <h3 style={styles.title}>🔗 P2P 网络</h3>
          <div style={styles.statusRow}>
            <span
              style={{
                ...styles.dot,
                background: running ? "#22c55e" : "#666",
              }}
            />
            <span style={styles.statusText}>
              {running ? "已连接" : "未启动"}
            </span>
            {running && (
              <span style={styles.peerCount}>
                {status?.active_peers ?? 0} 个节点在线
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            ...styles.btn,
            borderColor: running ? "#ef4444" : "#22c55e",
            color: running ? "#ef4444" : "#22c55e",
          }}
        >
          {loading ? "..." : running ? "断开" : "加入网络"}
        </button>
      </div>
      {running && (
        <div style={styles.info}>
          <p style={styles.infoText}>
            P2P 网络允许你与局域网内其他 AIDevProxy 用户共享缓存的 AI 包，大幅加速下载。
          </p>
        </div>
      )}
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
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "15px",
    fontWeight: 600,
    color: "#fff",
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
    fontSize: "14px",
    fontWeight: 500,
  },
  peerCount: {
    fontSize: "13px",
    color: "#9ba1b0",
  },
  btn: {
    padding: "8px 18px",
    borderRadius: "6px",
    border: "1px solid",
    background: "transparent",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  info: {
    marginTop: "12px",
    padding: "10px",
    background: "#0f1117",
    borderRadius: "6px",
  },
  infoText: {
    margin: 0,
    fontSize: "12px",
    color: "#9ba1b0",
    lineHeight: "1.5",
  },
};
