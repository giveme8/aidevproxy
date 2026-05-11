import React from "react";

type ButtonVariant =
  | "primary"
  | "primaryGlow"
  | "secondary"
  | "ghost"
  | "danger";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const variantStyles: Record<
  ButtonVariant,
  { bg: string; color: string; border: string }
> = {
  primary: {
    bg: "#22c55e",
    color: "#06140c",
    border: "#22c55e",
  },
  primaryGlow: {
    bg: "rgba(34,197,94,.15)",
    color: "#4ade80",
    border: "rgba(34,197,94,.4)",
  },
  secondary: {
    bg: "var(--bg-card-2)",
    color: "var(--text-primary)",
    border: "var(--border-strong)",
  },
  ghost: {
    bg: "transparent",
    color: "var(--text-secondary)",
    border: "var(--border)",
  },
  danger: {
    bg: "transparent",
    color: "#f87171",
    border: "rgba(239,68,68,.4)",
  },
};

export default function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  onClick,
  style,
  disabled = false,
}: ButtonProps) {
  const v = variantStyles[variant];
  const isSm = size === "sm";

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 500,
    borderRadius: 8,
    fontSize: isSm ? 12 : 13,
    padding: isSm ? "6px 10px" : "8px 14px",
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background .15s,border-color .15s",
    ...style,
  };

  return (
    <button
      style={baseStyle}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {children}
    </button>
  );
}
