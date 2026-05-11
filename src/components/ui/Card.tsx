import React from "react";

interface CardProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}

export default function Card({
  title,
  action,
  children,
  padding = 20,
  style,
}: CardProps) {
  const hasHeader = title !== undefined || action !== undefined;

  const containerStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    ...style,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `${padding}px ${padding}px 0 ${padding}px`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  };

  const contentStyle: React.CSSProperties = {
    padding: hasHeader ? `12px ${padding}px ${padding}px ${padding}px` : padding,
  };

  return (
    <div style={containerStyle}>
      {hasHeader && (
        <div style={headerStyle}>
          {title && <div style={titleStyle}>{title}</div>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={contentStyle}>{children}</div>
    </div>
  );
}
