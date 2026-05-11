import React from "react";
import { Toggle } from "./ui/Toggle";
import { APP_VERSION } from "../version";

interface SidebarProps {
  active: string;
  onChange: (page: string) => void;
  systemProxy: boolean;
  setSystemProxy: (v: boolean) => void;
  running: boolean;
  port: number;
}

const NAV_ITEMS: { key: string; label: string; icon: React.ReactNode }[] = [
  {
    key: "dashboard",
    label: "仪表盘",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="1.5" y="1.5" width="7" height="7" rx="1.5" fill="currentColor" />
        <rect x="11.5" y="1.5" width="7" height="7" rx="1.5" fill="currentColor" />
        <rect x="1.5" y="11.5" width="7" height="7" rx="1.5" fill="currentColor" />
        <rect x="11.5" y="11.5" width="7" height="7" rx="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "traffic",
    label: "流量",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="2.5" cy="4" r="1.5" fill="currentColor" />
        <rect x="6" y="3" width="12" height="2" rx="1" fill="currentColor" />
        <circle cx="2.5" cy="10" r="1.5" fill="currentColor" />
        <rect x="6" y="9" width="12" height="2" rx="1" fill="currentColor" />
        <circle cx="2.5" cy="16" r="1.5" fill="currentColor" />
        <rect x="6" y="15" width="12" height="2" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "cache",
    label: "缓存",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <ellipse cx="10" cy="5" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M3 5 L3 14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M17 5 L17 14" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="10" cy="14" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M3 9.5 A7 2.5 0 0 0 17 9.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: "nodes",
    label: "节点",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="5" cy="4" r="2.5" fill="currentColor" />
        <circle cx="15" cy="4" r="2.5" fill="currentColor" />
        <circle cx="10" cy="16" r="2.5" fill="currentColor" />
        <line x1="7.1" y1="5.5" x2="12.9" y2="14" stroke="currentColor" strokeWidth="1.5" />
        <line x1="12.9" y1="5.5" x2="7.1" y2="14" stroke="currentColor" strokeWidth="1.5" />
        <line x1="6.5" y1="5.5" x2="13.5" y2="5.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: "mirrors",
    label: "镜像",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <ellipse cx="10" cy="10" rx="4" ry="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 10 A8 8 0 0 0 18 10" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M2 10 A8 8 0 0 1 18 10" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" />
      </svg>
    ),
  },
  {
    key: "rules",
    label: "规则",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M5 2.5H12.5L16.5 6.5V17.5H5V2.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M12.5 2.5V6.5H16.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        <line x1="8" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8" y1="15" x2="12" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "设置",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="10" y1="3.5" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="14" x2="10" y2="16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3.5" y1="10" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="10" x2="16.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5.4" y1="5.4" x2="7.2" y2="7.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12.8" y1="12.8" x2="14.6" y2="14.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="5.4" y1="14.6" x2="7.2" y2="12.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12.8" y1="7.2" x2="14.6" y2="5.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

const navItemBase =
  "flex items-center gap-3 py-3 rounded-[10px] border-l-[3px] cursor-pointer w-full text-left relative transition-colors duration-150";

const navItemInactive =
  "px-[14px] border-l-transparent bg-transparent text-sm font-medium text-content-secondary hover:bg-white/5";

const navItemActive =
  "pl-[11px] pr-[14px] border-l-green-bright bg-green-soft text-green-bright font-semibold shadow-glow";

export default function Sidebar({
  active,
  onChange,
  systemProxy,
  setSystemProxy,
  running,
  port,
}: SidebarProps) {
  return (
    <aside className="w-60 h-full flex flex-col bg-surface-sidebar border-r border-edge-default pt-5 px-[14px] pb-4 box-border shrink-0 overflow-hidden">
      {/* Navigation */}
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`${navItemBase} ${isActive ? navItemActive : navItemInactive}`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 shrink-0 ${
                  isActive ? "text-green-bright font-semibold" : "text-content-secondary font-medium"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`${
                  isActive ? "font-semibold text-green-bright" : "font-medium text-content-secondary"
                } text-sm`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Section */}
      <div className="flex flex-col gap-[10px]">
        {/* Brand row */}
        <div className="flex items-center gap-[10px] mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-sidebar text-sm font-extrabold tracking-[0.5px] shrink-0 font-mono"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
          >
            AI
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-content-primary leading-tight">
              AI {"加速器"}
            </span>
            <span className="text-xs font-medium text-content-tertiary font-mono">{APP_VERSION}</span>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              running
                ? "bg-green shadow-[0_0_6px_rgba(34,197,94,.5)]"
                : "bg-content-tertiary"
            }`}
          />
          <span className="text-xs text-content-secondary font-medium">
            {running ? "运行中" : "已停止"}
          </span>
        </div>

        {/* Local proxy row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-content-tertiary font-medium">{"本地代理"}</span>
          <span className="text-xs text-content-secondary font-mono">
            127.0.0.1:{port}
          </span>
        </div>

        {/* System proxy row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-content-tertiary font-medium">{"系统代理"}</span>
          <Toggle value={systemProxy} onChange={setSystemProxy} size="sm" />
        </div>
      </div>
    </aside>
  );
}
