/**
 * Tauri API wrapper with HTTP fallback for browser dev mode.
 *
 * When running inside a Tauri webview, delegates to the real `@tauri-apps/api/core`.
 * When running in a regular browser (e.g. Vite dev at http://localhost:1420),
 * talks to the Rust http_server on localhost:3001.
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";

// Tauri 2 exposes `window.__TAURI_INTERNALS__`; Tauri 1 used `window.__TAURI__`.
const isTauri =
  typeof window !== "undefined" &&
  ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

// ---------------------------------------------------------------------------
// HTTP API fallback (talks to the Rust http_server on localhost:3001)
// ---------------------------------------------------------------------------

// Port can be overridden via VITE_HTTP_API_PORT env var (default 3001).
const HTTP_PORT = (import.meta.env.VITE_HTTP_API_PORT as string) || "3001";
const HTTP_API_BASE = `http://localhost:${HTTP_PORT}`;
let httpAvailable: boolean | null = null; // null = unchecked, true/false = cached

async function checkHttpAvailable(): Promise<boolean> {
  if (httpAvailable !== null) return httpAvailable;
  try {
    const resp = await fetch(`${HTTP_API_BASE}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    httpAvailable = resp.ok;
    if (httpAvailable) {
      console.log("[tauri-api] HTTP backend reachable at", HTTP_API_BASE);
    }
  } catch {
    httpAvailable = false;
  }
  return httpAvailable;
}

async function httpInvoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const resp = await fetch(`${HTTP_API_BASE}/api/${cmd}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args ?? {}),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "Unknown error");
    throw new Error(`HTTP ${resp.status}: ${errBody}`);
  }
  return resp.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public invoke
// ---------------------------------------------------------------------------

/**
 * Mirrors `invoke` from `@tauri-apps/api/core`.
 *
 * Resolution order:
 * 1. Tauri IPC (when running inside the Tauri webview)
 * 2. HTTP API  (when the Rust http_server is reachable – browser dev mode)
 *
 * Throws if neither backend is available.
 */
export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    return tauriInvoke<T>(cmd, args);
  }

  // Try the real Rust backend via HTTP
  if (await checkHttpAvailable()) {
    return httpInvoke<T>(cmd, args);
  }

  throw new Error(
    `[tauri-api] No backend available for "${cmd}". ` +
    `Start the Tauri app or ensure the HTTP API server is running on ${HTTP_API_BASE}.`
  );
}

/**
 * Re-export the isTauri flag so components can conditionally render
 * Tauri-only UI (e.g. "open in Tauri app" banner).
 */
export { isTauri };
