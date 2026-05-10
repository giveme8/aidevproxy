/**
 * Tauri API wrapper with browser side mock fallback.
 *
 * When running inside a Tauri webview, delegates to the real `@tauri-apps/api/core`.
 * When running in a regular browser (e.g. Vite dev at http://localhost:1420),
 * returns mock responses so the UI is usable for frontend development.
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

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

const mockHandlers: Record<string, (args?: Record<string, unknown>) => unknown> = {
  get_proxy_status: () => mockStatus.proxy,
  get_stats: () => mockStatus.stats,
  get_p2p_status: () => mockStatus.p2p,
  get_config: () => mockStatus.config,
  start_proxy: () => {
    mockStatus.proxy.running = true;
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
