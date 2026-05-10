import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProxyControl, { Dashboard } from "./Dashboard";

// Module-level mock state, resettable between tests
let mockRunning = false;

vi.mock("../tauri-api", () => ({
  invoke: vi.fn(async (cmd: string) => {
    switch (cmd) {
      case "get_proxy_status":
        return {
          running: mockRunning,
          port: 8899,
          config: {
            port: 8899,
            enable_mirror: true,
            enable_p2p: true,
            enable_cache: true,
            auto_start: false,
          },
        };
      case "get_stats":
        return {
          total_requests: 100,
          total_bytes_saved: 52428800,
          total_bytes_transferred: 104857600,
          mirror_hits: 42,
          p2p_hits: 7,
          active_peers: 3,
          cache_size_bytes: 268435456,
          uptime_seconds: 3661,
        };
      case "start_proxy":
        mockRunning = true;
        return "Proxy started";
      case "stop_proxy":
        mockRunning = false;
        return "Proxy stopped";
      default:
        return null;
    }
  }),
  isTauri: false,
}));

describe("ProxyControl", () => {
  beforeEach(() => {
    mockRunning = false;
    vi.clearAllMocks();
  });

  it("renders initial stopped state", async () => {
    render(<ProxyControl />);
    await waitFor(() => {
      expect(screen.getByText("已停止")).toBeInTheDocument();
    });
  });

  it("shows 启动代理 button when stopped", async () => {
    render(<ProxyControl />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "启动代理" })).toBeInTheDocument();
    });
  });

  it("toggles to running when 启动代理 is clicked", async () => {
    const user = userEvent.setup();
    render(<ProxyControl />);

    await waitFor(() => {
      expect(screen.getByText("已停止")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "启动代理" }));

    await waitFor(() => {
      expect(screen.getByText("运行中")).toBeInTheDocument();
    });
  });

  it("shows proxy address after starting", async () => {
    const user = userEvent.setup();
    render(<ProxyControl />);

    await waitFor(() => {
      expect(screen.getByText("已停止")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "启动代理" }));

    await waitFor(() => {
      expect(screen.getByText(/HTTP_PROXY=http:\/\/127\.0\.0\.1:8899/)).toBeInTheDocument();
    });
  });

  it("shows 停止代理 after proxy is started", async () => {
    const user = userEvent.setup();
    render(<ProxyControl />);

    await waitFor(() => {
      expect(screen.getByText("已停止")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "启动代理" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "停止代理" })).toBeInTheDocument();
    });
  });
});

describe("Dashboard", () => {
  it("renders traffic stats cards", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("📊 流量统计")).toBeInTheDocument();
    });

    const statLabels = [
      "总请求",
      "传输流量",
      "节省流量",
      "镜像命中",
      "P2P 命中",
      "缓存大小",
      "活跃节点",
      "运行时间",
    ];

    for (const label of statLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
