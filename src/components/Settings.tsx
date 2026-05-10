import { useState, useEffect } from "react";
import { invoke } from "../tauri-api";

interface ProxyConfig {
  port: number;
  enable_mirror: boolean;
  enable_p2p: boolean;
  enable_cache: boolean;
  auto_start: boolean;
}

export default function Settings() {
  const [config, setConfig] = useState<ProxyConfig>({
    port: 8899,
    enable_mirror: true,
    enable_p2p: true,
    enable_cache: true,
    auto_start: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const c = await invoke<ProxyConfig>("get_config");
        setConfig(c);
      } catch (e) {
        console.error(e);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      await invoke("update_config", { config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div style={styles.card}>
        <h3 style={styles.title}>⚙️ 代理设置</h3>

        <div style={styles.field}>
          <label style={styles.label}>代理端口</label>
          <input
            type="number"
            value={config.port}
            onChange={(e) =>
              setConfig({ ...config, port: parseInt(e.target.value) || 8899 })
            }
            style={styles.input}
            min={1024}
            max={65535}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={config.enable_mirror}
              onChange={(e) =>
                setConfig({ ...config, enable_mirror: e.target.checked })
              }
              style={styles.checkbox}
            />
            启用智能镜像路由
          </label>
          <span style={styles.hint}>
            自动将 pip/conda/HuggingFace/Docker 请求路由到国内快速镜像
          </span>
        </div>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={config.enable_p2p}
              onChange={(e) =>
                setConfig({ ...config, enable_p2p: e.target.checked })
              }
              style={styles.checkbox}
            />
            启用 P2P 加速
          </label>
          <span style={styles.hint}>
            与局域网内其他用户共享缓存，大幅加速重复下载
          </span>
        </div>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={config.enable_cache}
              onChange={(e) =>
                setConfig({ ...config, enable_cache: e.target.checked })
              }
              style={styles.checkbox}
            />
            启用本地缓存
          </label>
          <span style={styles.hint}>将下载的包缓存到本地，加速后续安装</span>
        </div>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={config.auto_start}
              onChange={(e) =>
                setConfig({ ...config, auto_start: e.target.checked })
              }
              style={styles.checkbox}
            />
            开机自启动代理
          </label>
        </div>

        <button onClick={handleSave} style={styles.saveBtn}>
          {saved ? "✓ 已保存" : "保存设置"}
        </button>
      </div>

      <div style={styles.card}>
        <h3 style={styles.title}>📋 使用说明</h3>
        <div style={styles.help}>
          <p style={styles.helpTitle}>1. 设置环境变量</p>
          <code style={styles.code}>
            export HTTP_PROXY=http://127.0.0.1:{config.port}
          </code>
          <br />
          <code style={styles.code}>
            export HTTPS_PROXY=http://127.0.0.1:{config.port}
          </code>

          <p style={styles.helpTitle}>2. 或配置 pip</p>
          <code style={styles.code}>
            pip install --proxy http://127.0.0.1:{config.port} package-name
          </code>

          <p style={styles.helpTitle}>3. 或配置 HuggingFace</p>
          <code style={styles.code}>
            export HF_ENDPOINT=https://hf-mirror.com
          </code>
          <p style={styles.hint}>
            AIDevProxy 会自动将 HF 请求重定向到 hf-mirror.com 镜像
          </p>

          <p style={styles.helpTitle}>4. 支持的服务</p>
          <ul style={styles.list}>
            <li>pip (PyPI) → 清华/阿里云/中科大镜像</li>
            <li>conda & Anaconda → 清华镜像</li>
            <li>HuggingFace Models/Datasets → hf-mirror.com</li>
            <li>npm → npmmirror.com</li>
            <li>Docker Hub → USTC 镜像</li>
          </ul>
        </div>
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
  title: {
    margin: "0 0 20px 0",
    fontSize: "15px",
    fontWeight: 600,
    color: "#fff",
  },
  field: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#e4e6eb",
    marginBottom: "6px",
  },
  input: {
    width: "auto",
    minWidth: "120px",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #2a2d35",
    background: "#0f1117",
    color: "#e4e6eb",
    fontSize: "14px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#e4e6eb",
    cursor: "pointer",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
    accentColor: "#1a6ff5",
  },
  hint: {
    display: "block",
    fontSize: "11px",
    color: "#6b7280",
    marginTop: "4px",
    marginLeft: "24px",
  },
  saveBtn: {
    marginTop: "8px",
    padding: "10px 28px",
    borderRadius: "8px",
    border: "none",
    background: "#1a6ff5",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  help: {
    fontSize: "13px",
    color: "#d1d5db",
    lineHeight: "1.8",
  },
  helpTitle: {
    fontSize: "13px",
    fontWeight: 600,
    margin: "16px 0 4px 0",
    color: "#fff",
  },
  code: {
    fontSize: "12px",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    color: "#22c55e",
    background: "#0f1117",
    padding: "3px 8px",
    borderRadius: "4px",
    display: "inline-block",
    marginBottom: "2px",
  },
  list: {
    margin: "4px 0 0 0",
    paddingLeft: "18px",
    color: "#9ba1b0",
    fontSize: "12px",
    lineHeight: "1.8",
  },
};
