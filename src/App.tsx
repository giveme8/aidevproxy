import { useState } from "react";
import ProxyControl, { Dashboard } from "./components/Dashboard";
import P2PStatus from "./components/P2PStatus";
import Settings from "./components/Settings";

type Page = "dashboard" | "settings";

function App() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logo}>⚡</span>
          <h1 style={styles.title}>AIDevProxy</h1>
        </div>
        <nav style={styles.nav}>
          <button
            onClick={() => setPage("dashboard")}
            style={{
              ...styles.navBtn,
              ...(page === "dashboard" ? styles.navBtnActive : {}),
            }}
          >
            仪表盘
          </button>
          <button
            onClick={() => setPage("settings")}
            style={{
              ...styles.navBtn,
              ...(page === "settings" ? styles.navBtnActive : {}),
            }}
          >
            设置
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        {page === "dashboard" ? (
          <div>
            <ProxyControl />
            <Dashboard />
            <P2PStatus />
          </div>
        ) : (
          <Settings />
        )}
      </main>

      <footer style={styles.footer}>
        <span>AIDevProxy v0.1.0 - AI 开发环境加速代理</span>
        <span style={styles.footerRight}>
          本地代理 · 智能镜像 · P2P 加速
        </span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    background: "#0f1117",
    color: "#e4e6eb",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px",
    borderBottom: "1px solid #2a2d35",
    background: "#16181d",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logo: {
    fontSize: "28px",
  },
  title: {
    fontSize: "18px",
    fontWeight: 700,
    margin: 0,
    color: "#fff",
  },
  nav: {
    display: "flex",
    gap: "8px",
  },
  navBtn: {
    padding: "6px 16px",
    borderRadius: "6px",
    border: "1px solid #2a2d35",
    background: "transparent",
    color: "#9ba1b0",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
  },
  navBtnActive: {
    background: "#1a6ff5",
    color: "#fff",
    borderColor: "#1a6ff5",
  },
  main: {
    flex: 1,
    padding: "20px 24px",
    overflowY: "auto",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 24px",
    borderTop: "1px solid #2a2d35",
    fontSize: "11px",
    color: "#555",
    background: "#16181d",
  },
  footerRight: {
    color: "#444",
  },
};

export default App;
