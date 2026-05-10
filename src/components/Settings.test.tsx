import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "./Settings";

const mockUpdateConfig = vi.fn();

vi.mock("../tauri-api", () => ({
  invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === "get_config") {
      return {
        port: 8899,
        enable_mirror: true,
        enable_p2p: true,
        enable_cache: true,
        auto_start: false,
      };
    }
    if (cmd === "update_config") {
      mockUpdateConfig(args?.config);
      return "Config updated";
    }
    return null;
  }),
  isTauri: false,
}));

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders settings page title", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText("⚙️ 代理设置")).toBeInTheDocument();
    });
  });

  it("renders all config form fields", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText("代理端口")).toBeInTheDocument();
      expect(screen.getByText("启用智能镜像路由")).toBeInTheDocument();
      expect(screen.getByText("启用 P2P 加速")).toBeInTheDocument();
      expect(screen.getByText("启用本地缓存")).toBeInTheDocument();
      expect(screen.getByText("开机自启动代理")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "保存设置" })).toBeInTheDocument();
    });
  });

  it("allows changing port value", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText("代理端口")).toBeInTheDocument();
    });

    const portInput = screen.getByRole("spinbutton") as HTMLInputElement;
    await user.tripleClick(portInput);
    await user.keyboard("9999");

    expect(portInput).toHaveValue(9999);
  });

  it("saves config and shows confirmation", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByText("保存设置")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "保存设置" }));

    await waitFor(() => {
      expect(screen.getByText("✓ 已保存")).toBeInTheDocument();
    });

    expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
  });

  it("renders usage instructions", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText("📋 使用说明")).toBeInTheDocument();
      expect(screen.getByText("1. 设置环境变量")).toBeInTheDocument();
      expect(screen.getByText("2. 或配置 pip")).toBeInTheDocument();
      expect(screen.getByText("3. 或配置 HuggingFace")).toBeInTheDocument();
      expect(screen.getByText("4. 支持的服务")).toBeInTheDocument();
    });
  });
});
