import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import P2PStatus from "./P2PStatus";

let mockP2pRunning = false;

vi.mock("../tauri-api", () => ({
  invoke: vi.fn(async (cmd: string) => {
    switch (cmd) {
      case "get_p2p_status":
        return {
          running: mockP2pRunning,
          active_peers: mockP2pRunning ? 3 : 0,
          p2p_hits: mockP2pRunning ? 7 : 0,
          cache_size_bytes: mockP2pRunning ? 268435456 : 0,
        };
      case "start_p2p":
        mockP2pRunning = true;
        return "P2P started";
      case "stop_p2p":
        mockP2pRunning = false;
        return "P2P stopped";
      default:
        return null;
    }
  }),
  isTauri: false,
}));

describe("P2PStatus", () => {
  beforeEach(() => {
    mockP2pRunning = false;
    vi.clearAllMocks();
  });

  it("renders initial disconnected state", async () => {
    render(<P2PStatus />);
    await waitFor(() => {
      expect(screen.getByText("未启动")).toBeInTheDocument();
    });
  });

  it("shows 加入网络 button when disconnected", async () => {
    render(<P2PStatus />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "加入网络" })).toBeInTheDocument();
    });
  });

  it("switches to connected state on click", async () => {
    const user = userEvent.setup();
    render(<P2PStatus />);

    await waitFor(() => {
      expect(screen.getByText("未启动")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "加入网络" }));

    await waitFor(() => {
      expect(screen.getByText("已连接")).toBeInTheDocument();
    });
  });

  it("shows 断开 after connected", async () => {
    const user = userEvent.setup();
    render(<P2PStatus />);

    await waitFor(() => {
      expect(screen.getByText("未启动")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "加入网络" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "断开" })).toBeInTheDocument();
    });
  });

  it("shows peer count when connected", async () => {
    const user = userEvent.setup();
    render(<P2PStatus />);

    await waitFor(() => {
      expect(screen.getByText("未启动")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "加入网络" }));

    await waitFor(() => {
      expect(screen.getByText(/3 个节点在线/)).toBeInTheDocument();
    });
  });

  it("shows help text when connected", async () => {
    const user = userEvent.setup();
    render(<P2PStatus />);

    await waitFor(() => {
      expect(screen.getByText("未启动")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "加入网络" }));

    await waitFor(() => {
      expect(screen.getByText(/P2P 网络允许你与局域网内其他/)).toBeInTheDocument();
    });
  });
});
