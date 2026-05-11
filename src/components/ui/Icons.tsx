import React from "react";

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Factory — DRY wrapper for all standard icons
// ---------------------------------------------------------------------------

function createIcon(
  renderPaths: () => React.ReactNode,
): React.FC<IconProps> {
  const Component: React.FC<IconProps> = ({ size = 16, className, style }) => (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {renderPaths()}
      </svg>
    </span>
  );
  Component.displayName = "Icon";
  return Component;
}

// ===========================================================================
// 1. IconDashboard — 2×2 grid of rounded rectangles
// ===========================================================================

export const IconDashboard = createIcon(() => (
  <>
    <rect x="3" y="3" width="8" height="8" rx="1.5" ry="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" ry="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" ry="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" ry="1.5" />
  </>
));

// ===========================================================================
// 2. IconTraffic — horizontal lines with dots (activity / list)
// ===========================================================================

export const IconTraffic = createIcon(() => (
  <>
    <circle cx="4" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
    <line x1="7" y1="5.5" x2="21" y2="5.5" />
    <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <line x1="7" y1="12" x2="21" y2="12" />
    <circle cx="4" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
    <line x1="7" y1="18.5" x2="17" y2="18.5" />
  </>
));

// ===========================================================================
// 3. IconCache — database / cylinder stack (3 stacked ellipses)
// ===========================================================================

export const IconCache = createIcon(() => (
  <>
    <ellipse cx="12" cy="5.5" rx="6" ry="2" />
    <path d="M6 5.5v13a6 2 0 0 0 12 0v-13" />
    <path d="M6 9.83a6 2 0 0 0 12 0" />
    <path d="M6 14.17a6 2 0 0 0 12 0" />
  </>
));

// ===========================================================================
// 4. IconNodes — network nodes (5 circles connected by lines)
// ===========================================================================

export const IconNodes = createIcon(() => (
  <>
    <line x1="12" y1="3" x2="4" y2="9" />
    <line x1="12" y1="3" x2="20" y2="9" />
    <line x1="4" y1="9" x2="6" y2="20" />
    <line x1="20" y1="9" x2="18" y2="20" />
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="6" y1="20" x2="18" y2="20" />
    <circle cx="12" cy="3" r="2" />
    <circle cx="4" cy="9" r="2" />
    <circle cx="20" cy="9" r="2" />
    <circle cx="6" cy="20" r="2" />
    <circle cx="18" cy="20" r="2" />
  </>
));

// ===========================================================================
// 5. IconMirror — globe with meridians
// ===========================================================================

export const IconMirror = createIcon(() => (
  <>
    <circle cx="12" cy="12" r="9.5" />
    <ellipse cx="12" cy="12" rx="5" ry="9.5" />
    <line x1="2.5" y1="12" x2="21.5" y2="12" />
    <line x1="12" y1="2.5" x2="12" y2="21.5" />
  </>
));

// ===========================================================================
// 6. IconRules — document with lines (list / rules)
// ===========================================================================

export const IconRules = createIcon(() => (
  <>
    <path d="M5 3h9l5 5v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <line x1="8" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="16" y2="14" />
    <line x1="8" y1="18" x2="13" y2="18" />
  </>
));

// ===========================================================================
// 7. IconSettings — gear / cog
// ===========================================================================

export const IconSettings = createIcon(() => (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M2 12h2M20 12h2" />
  </>
));

// ===========================================================================
// 8. IconTerminal — terminal window with prompt lines
// ===========================================================================

export const IconTerminal = createIcon(() => (
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <polyline points="7 8 10 11 7 14" />
    <line x1="11" y1="14" x2="17" y2="14" />
    <line x1="7" y1="17" x2="14" y2="17" />
  </>
));

// ===========================================================================
// 9. IconBell — notification bell
// ===========================================================================

export const IconBell = createIcon(() => (
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>
));

// ===========================================================================
// 10. IconGear — gear (smaller variant, same shape as IconSettings)
// ===========================================================================

export const IconGear = createIcon(() => (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M2 12h2M20 12h2" />
  </>
));

// ===========================================================================
// 11. IconSearch — magnifying glass
// ===========================================================================

export const IconSearch = createIcon(() => (
  <>
    <circle cx="11" cy="11" r="7.5" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </>
));

// ===========================================================================
// 12. IconChevronDown — down chevron
// ===========================================================================

export const IconChevronDown = createIcon(() => (
  <polyline points="6 9 12 15 18 9" />
));

// ===========================================================================
// 13. IconChevronRight — right chevron
// ===========================================================================

export const IconChevronRight = createIcon(() => (
  <polyline points="9 18 15 12 9 6" />
));

// ===========================================================================
// 14. IconChevronLeft — left chevron
// ===========================================================================

export const IconChevronLeft = createIcon(() => (
  <polyline points="15 18 9 12 15 6" />
));

// ===========================================================================
// 15. IconRefresh — refresh / reload
// ===========================================================================

export const IconRefresh = createIcon(() => (
  <>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </>
));

// ===========================================================================
// 16. IconTrash — trash can
// ===========================================================================

export const IconTrash = createIcon(() => (
  <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
  </>
));

// ===========================================================================
// 17. IconSpeedo — speedometer / gauge
// ===========================================================================

export const IconSpeedo = createIcon(() => (
  <>
    <path d="M2 18a10 10 0 0 1 20 0" />
    <circle cx="12" cy="18" r="1.8" fill="currentColor" stroke="none" />
    <line x1="12" y1="18" x2="15" y2="8" />
  </>
));

// ===========================================================================
// 18. IconExport — export (arrow up out of box)
// ===========================================================================

export const IconExport = createIcon(() => (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>
));

// ===========================================================================
// 19. IconImport — import (arrow down into box)
// ===========================================================================

export const IconImport = createIcon(() => (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 13 12 18 17 13" />
    <line x1="12" y1="18" x2="12" y2="9" />
  </>
));

// ===========================================================================
// 20. IconPlus — plus
// ===========================================================================

export const IconPlus = createIcon(() => (
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>
));

// ===========================================================================
// 21. IconMinus — minus
// ===========================================================================

export const IconMinus = createIcon(() => (
  <line x1="5" y1="12" x2="19" y2="12" />
));

// ===========================================================================
// 22. IconClose — X close
// ===========================================================================

export const IconClose = createIcon(() => (
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>
));

// ===========================================================================
// 23. IconCheck — checkmark
// ===========================================================================

export const IconCheck = createIcon(() => (
  <polyline points="20 6 9 17 4 12" />
));

// ===========================================================================
// 24. IconCheckCircle — checkmark in circle
// ===========================================================================

export const IconCheckCircle = createIcon(() => (
  <>
    <circle cx="12" cy="12" r="9.5" />
    <polyline points="16 8 10.5 14 8 11" />
  </>
));

// ===========================================================================
// 25. IconShield — shield
// ===========================================================================

export const IconShield = createIcon(() => (
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
));

// ===========================================================================
// 26. IconFolder — folder
// ===========================================================================

export const IconFolder = createIcon(() => (
  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
));

// ===========================================================================
// 27. IconStar — star
// ===========================================================================

export const IconStar = createIcon(() => (
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
));

// ===========================================================================
// 28. IconBan — ban / circle-slash
// ===========================================================================

export const IconBan = createIcon(() => (
  <>
    <circle cx="12" cy="12" r="9.5" />
    <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" />
  </>
));

// ===========================================================================
// 29. IconCopy — copy (two overlapping rectangles)
// ===========================================================================

export const IconCopy = createIcon(() => (
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>
));

// ===========================================================================
// 30. IconEdit — edit / pencil
// ===========================================================================

export const IconEdit = createIcon(() => (
  <>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>
));

// ===========================================================================
// 31. IconDrag — drag handle (6 dots in 2 columns)
// ===========================================================================

export const IconDrag = createIcon(() => (
  <>
    <circle cx="8" cy="5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="16" cy="5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="8" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="8" cy="19" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="16" cy="19" r="1.3" fill="currentColor" stroke="none" />
  </>
));

// ===========================================================================
// 32. IconDots — three horizontal dots (more)
// ===========================================================================

export const IconDots = createIcon(() => (
  <>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </>
));

// ===========================================================================
// 33. IconLink — link / chain
// ===========================================================================

export const IconLink = createIcon(() => (
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>
));

// ===========================================================================
// 34. IconFilter — filter / funnel
// ===========================================================================

export const IconFilter = createIcon(() => (
  <polygon points="22 3 2 3 9 12.5 9 20 15 22 15 12.5" />
));

// ===========================================================================
// 35. IconLaptop — laptop
// ===========================================================================

export const IconLaptop = createIcon(() => (
  <>
    <rect x="4" y="4" width="16" height="11" rx="2" />
    <path d="M2 19h20" />
    <path d="M6 19v-2" />
    <path d="M18 19v-2" />
  </>
));

// ===========================================================================
// 36. IconDesktop — desktop monitor
// ===========================================================================

export const IconDesktop = createIcon(() => (
  <>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </>
));

// ===========================================================================
// 37. IconPhone — smartphone
// ===========================================================================

export const IconPhone = createIcon(() => (
  <>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <line x1="12" y1="18" x2="12" y2="18.01" />
  </>
));

// ===========================================================================
// 38. IconServer — server rack (two stacked rectangles)
// ===========================================================================

export const IconServer = createIcon(() => (
  <>
    <rect x="3" y="3" width="18" height="6" rx="1" />
    <rect x="3" y="13" width="18" height="6" rx="1" />
    <circle cx="6.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="10" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="10" cy="16" r="1.2" fill="currentColor" stroke="none" />
  </>
));

// ===========================================================================
// 39. IconUsers — people / group
// ===========================================================================

export const IconUsers = createIcon(() => (
  <>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
));

// ===========================================================================
// 40. IconRadar — radar / satellite (concentric circles with crosshair)
// ===========================================================================

export const IconRadar = createIcon(() => (
  <>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2.5" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </>
));

// ===========================================================================
// 41. IconExternal — external link (arrow out of square)
// ===========================================================================

export const IconExternal = createIcon(() => (
  <>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </>
));

// ===========================================================================
// 42. IconPause — pause (two vertical bars, filled)
// ===========================================================================

export const IconPause = createIcon(() => (
  <>
    <rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none" />
  </>
));

// ===========================================================================
// 43. IconPlay — play triangle (filled)
// ===========================================================================

export const IconPlay = createIcon(() => (
  <polygon points="6 3 20 12 6 21" fill="currentColor" stroke="none" />
));

// ===========================================================================
// 44. IconWave — waveform / activity
// ===========================================================================

export const IconWave = createIcon(() => (
  <polyline points="2 12 5 7 8 17 11 12 14 7 17 17 20 12 22 12" />
));

// ===========================================================================
// 45. IconReset — reset
// ===========================================================================

export const IconReset = createIcon(() => (
  <>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </>
));

// ===========================================================================
// 46. IconHelp — help / question circle
// ===========================================================================

export const IconHelp = createIcon(() => (
  <>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>
));

// ===========================================================================
// Tool-specific icons (preserved for backward compatibility)
// ===========================================================================

export const IconPip: React.FC<IconProps> = ({ size = 16, className, style }) => (
  <span
    className={className}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      flexShrink: 0,
      color: "#4ade80",
      ...style,
    }}
  >
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  </span>
);

export const IconNpm: React.FC<IconProps> = ({ size = 16, className, style }) => (
  <span
    className={className}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      flexShrink: 0,
      color: "#f87171",
      ...style,
    }}
  >
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M0 0v24h24V0H0zm20 4v16H4V4h16zm-3 3H7v10h2V9h2v8h2V9h2v8h2V7z" />
    </svg>
  </span>
);

export const IconHuggingface: React.FC<IconProps> = ({ size = 16, className, style }) => (
  <span
    className={className}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      flexShrink: 0,
      color: "#facc15",
      ...style,
    }}
  >
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  </span>
);

export const IconDocker: React.FC<IconProps> = ({ size = 16, className, style }) => (
  <span
    className={className}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      flexShrink: 0,
      color: "#60a5fa",
      ...style,
    }}
  >
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="3" />
      <path d="M6 13h.01M9 13h.01M12 13h.01M15 13h.01M7 10h4V6H7zM13 8h2V5h-2z" />
    </svg>
  </span>
);

// ===========================================================================
// Default export — Icons object mapping keys to components
// ===========================================================================

const Icons: Record<string, React.FC<IconProps>> = {
  Dashboard: IconDashboard,
  Traffic: IconTraffic,
  Cache: IconCache,
  Nodes: IconNodes,
  Mirror: IconMirror,
  Rules: IconRules,
  Settings: IconSettings,
  Terminal: IconTerminal,
  Bell: IconBell,
  Gear: IconGear,
  Search: IconSearch,
  ChevronDown: IconChevronDown,
  ChevronRight: IconChevronRight,
  ChevronLeft: IconChevronLeft,
  Refresh: IconRefresh,
  Trash: IconTrash,
  Speedo: IconSpeedo,
  Export: IconExport,
  Import: IconImport,
  Plus: IconPlus,
  Minus: IconMinus,
  Close: IconClose,
  Check: IconCheck,
  CheckCircle: IconCheckCircle,
  Shield: IconShield,
  Folder: IconFolder,
  Star: IconStar,
  Ban: IconBan,
  Copy: IconCopy,
  Edit: IconEdit,
  Drag: IconDrag,
  Dots: IconDots,
  Link: IconLink,
  Filter: IconFilter,
  Laptop: IconLaptop,
  Desktop: IconDesktop,
  Phone: IconPhone,
  Server: IconServer,
  Users: IconUsers,
  Radar: IconRadar,
  External: IconExternal,
  Pause: IconPause,
  Play: IconPlay,
  Wave: IconWave,
  Reset: IconReset,
  Help: IconHelp,
  Pip: IconPip,
  Npm: IconNpm,
  Huggingface: IconHuggingface,
  Docker: IconDocker,
};

export default Icons;
