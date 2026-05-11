import React from "react";

type BadgeColor = "green" | "yellow" | "orange" | "red" | "blue" | "purple" | "gray";

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  size?: "sm" | "md";
}

const colorMap: Record<BadgeColor, { bg: string; fg: string; border: string }> = {
  green: {
    bg: "rgba(34,197,94,.12)",
    fg: "#4ade80",
    border: "rgba(34,197,94,.3)",
  },
  yellow: {
    bg: "rgba(250,204,21,.12)",
    fg: "#facc15",
    border: "rgba(250,204,21,.3)",
  },
  orange: {
    bg: "rgba(251,146,60,.12)",
    fg: "#fb923c",
    border: "rgba(251,146,60,.3)",
  },
  red: {
    bg: "rgba(239,68,68,.12)",
    fg: "#f87171",
    border: "rgba(239,68,68,.3)",
  },
  blue: {
    bg: "rgba(96,165,250,.12)",
    fg: "#60a5fa",
    border: "rgba(96,165,250,.3)",
  },
  purple: {
    bg: "rgba(167,139,250,.12)",
    fg: "#a78bfa",
    border: "rgba(167,139,250,.3)",
  },
  gray: {
    bg: "rgba(148,163,184,.10)",
    fg: "#94a3b8",
    border: "rgba(148,163,184,.25)",
  },
};

function startsWithDigit(content: React.ReactNode): boolean {
  if (typeof content === "string") return /^\d/.test(content);
  if (typeof content === "number") return true;
  if (Array.isArray(content)) {
    return content.some((child) => {
      if (typeof child === "string") return /^\d/.test(child);
      if (typeof child === "number") return true;
      return false;
    });
  }
  return false;
}

export default function Badge({
  children,
  color = "gray",
  size = "md",
}: BadgeProps) {
  const c = colorMap[color];
  const isSm = size === "sm";

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: isSm ? "2px 8px" : "3px 10px",
    fontSize: isSm ? 10 : 11,
    fontWeight: 500,
    borderRadius: 6,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    background: c.bg,
    color: c.fg,
    border: `1px solid ${c.border}`,
    fontFamily: startsWithDigit(children)
      ? "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace"
      : undefined,
  };

  return <span style={style}>{children}</span>;
}
