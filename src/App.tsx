import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import TrafficPage from "./pages/TrafficPage";
import CachePage from "./pages/CachePage";
import NodesPage from "./pages/NodesPage";
import MirrorsPage from "./pages/MirrorsPage";
import RulesPage from "./pages/RulesPage";
import SettingsPage from "./pages/SettingsPage";
import { invoke } from "./tauri-api";

type PageId = "dashboard" | "traffic" | "cache" | "nodes" | "mirrors" | "rules" | "settings";

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

const PAGES: Record<PageId, React.FC<{ goTo?: (p: string) => void }>> = {
  dashboard: DashboardPage,
  traffic: TrafficPage,
  cache: CachePage,
  nodes: NodesPage,
  mirrors: MirrorsPage,
  rules: RulesPage,
  settings: SettingsPage,
};

export default function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [systemProxy, setSystemProxy] = useState(true);
  const [proxyRunning, setProxyRunning] = useState(false);
  const [proxyPort, setProxyPort] = useState(8899);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await invoke<ProxyStatus>("get_proxy_status");
      setProxyRunning(s.running);
      setProxyPort(s.port);
    } catch {
      // keep defaults when backend unavailable
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const ActivePage = PAGES[page] || DashboardPage;

  return (
    <div style={styles.window}>
      <Header
        port={`127.0.0.1:${proxyPort}`}
        running={proxyRunning}
        hasNotification={page !== "traffic"}
        onTerminal={() => {}}
        onBell={() => {}}
        onSettings={() => setPage("settings")}
      />
      <div style={styles.body}>
        <Sidebar
          active={page}
          onChange={(p) => setPage(p as PageId)}
          systemProxy={systemProxy}
          setSystemProxy={setSystemProxy}
          running={proxyRunning}
          port={proxyPort}
        />
        <main style={styles.main}>
          <ActivePage
            goTo={(p) => setPage(p as PageId)}
            {...(page === "dashboard" ? { onProxyToggle: fetchStatus } : {})}
          />
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  window: {
    width: "100vw",
    height: "100vh",
    background: "var(--bg-canvas, #0f1614)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "'Plus Jakarta Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    color: "var(--text-primary, #e8f5ef)",
  },
  body: {
    flex: 1,
    display: "flex",
    minHeight: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
};
