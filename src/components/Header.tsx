interface HeaderProps {
  port?: string;
  running?: boolean;
  hasNotification?: boolean;
  onTerminal?: () => void;
  onBell?: () => void;
  onSettings?: () => void;
}

const TRAFFIC_LIGHTS = [
  { color: "#ff5f57", label: "Close" },
  { color: "#febc2e", label: "Minimize" },
  { color: "#28c840", label: "Zoom" },
];

function TerminalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect
        x="2"
        y="3"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="6"
        y="14"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontSize="9"
        fontWeight="700"
        fill="currentColor"
      >
        &gt;_
      </text>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.5C7.2 2.5 5.5 4.5 5.5 7.5V11L3.5 13.2V14.5H16.5V13.2L14.5 11V7.5C14.5 4.5 12.8 2.5 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M8 15.5C8 16.6 8.9 17.5 10 17.5C11.1 17.5 12 16.6 12 15.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
  );
}

function MinimizeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <line
        x1="4"
        y1="10"
        x2="16"
        y2="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const iconButtonClass =
  "w-[34px] h-[34px] rounded-lg inline-flex items-center justify-center shrink-0 transition-colors duration-150 hover:bg-white/5 text-content-secondary";

export default function Header({
  port = "127.0.0.1:7890",
  running = true,
  hasNotification = false,
  onTerminal,
  onBell,
  onSettings,
}: HeaderProps) {
  return (
    <header className="flex items-center w-full h-16 pr-4 box-border bg-surface-sidebar border-b border-edge-default shrink-0 select-none">
      {/* Left section */}
      <div className="flex items-center gap-[10px] w-60 pl-4 box-border shrink-0">
        {/* macOS traffic lights */}
        <div className="flex items-center gap-2 shrink-0">
          {TRAFFIC_LIGHTS.map((tl) => (
            <div
              key={tl.label}
              className="w-[13px] h-[13px] rounded-full shrink-0"
              style={{ background: tl.color }}
            />
          ))}
        </div>

        {/* Brand cube logo */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-surface-sidebar text-xs font-extrabold tracking-[0.5px] shrink-0 font-mono"
          style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
        >
          AI
        </div>

        {/* Title + subtitle */}
        <div className="flex flex-col gap-px">
          <span className="text-[17px] font-bold text-content-primary leading-tight">
            AI {"加速器"}
          </span>
          <span className="text-xs font-medium text-content-tertiary leading-tight">
            AIDevProxy
          </span>
        </div>
      </div>

      {/* Center spacer */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-[6px] shrink-0">
        {/* Status pill */}
        <div className="flex items-center gap-2 py-[6px] px-[14px] bg-surface-card border border-edge-default rounded-lg shrink-0">
          <span
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${
              running ? "bg-green shadow-[0_0_6px_rgba(34,197,94,.5)]" : "bg-content-tertiary"
            }`}
          />
          <span
            className={`text-xs font-semibold ${
              running ? "text-content-primary" : "text-content-tertiary"
            }`}
          >
            {running ? "Running" : "Stopped"}
          </span>
          <span className="w-px h-4 bg-edge-default shrink-0" />
          <span className="text-xs text-content-secondary font-mono">{port}</span>
        </div>

        {/* Terminal button */}
        <button
          className={iconButtonClass}
          onClick={onTerminal}
          aria-label="Terminal"
        >
          <TerminalIcon />
        </button>

        {/* Bell button with notification dot */}
        <button
          className={`${iconButtonClass} relative`}
          onClick={onBell}
          aria-label="Notifications"
        >
          <BellIcon />
          {hasNotification && (
            <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] rounded-full bg-green shadow-[0_0_6px_rgba(34,197,94,.7)]" />
          )}
        </button>

        {/* Settings gear button */}
        <button
          className={iconButtonClass}
          onClick={onSettings}
          aria-label="Settings"
        >
          <GearIcon />
        </button>

        {/* Minimize button */}
        <button
          className={iconButtonClass}
          aria-label="Minimize"
        >
          <MinimizeIcon />
        </button>
      </div>
    </header>
  );
}
