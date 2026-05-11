import React from "react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  trend?: string;
  sparkData?: number[];
  sparkColor?: string;
  icon?: React.ReactNode;
  donutValue?: number;
  children?: React.ReactNode;
}

/** Simple inline SVG sparkline. */
function Sparkline({
  data,
  color = "#4ade80",
  width = 80,
  height = 28,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 1;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", flexShrink: 0 }}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Simple inline SVG donut ring. */
function DonutRing({
  value,
  size = 40,
  strokeWidth = 3,
  color = "#4ade80",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const r = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - clamped);

  return (
    <svg
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.3s ease" }}
      />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  unit,
  sub,
  trend,
  sparkData,
  sparkColor,
  icon,
  donutValue,
  children,
}: StatCardProps) {
  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 18,
    display: "flex",
    flexDirection: "column",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 10,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const valueRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 30,
    fontWeight: 700,
    color: "var(--text-primary)",
    fontFamily:
      "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace",
  };

  const unitStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--text-tertiary)",
    fontWeight: 500,
    marginLeft: 2,
  };

  const visualRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8,
    minHeight: 28,
  };

  const trendSubStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    flex: 1,
  };

  const iconContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    opacity: 0.5,
    flexShrink: 0,
    color: "var(--text-tertiary)",
  };

  const trendStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: trend && !trend.startsWith("-") ? "#4ade80" : "#f87171",
    flexShrink: 0,
  };

  const subStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-tertiary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  };

  const hasVisual =
    (sparkData && sparkData.length > 0) || donutValue !== undefined || icon;
  const hasMeta = sub || trend;

  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={valueRowStyle}>
        <span style={valueStyle}>{value}</span>
        {unit && <span style={unitStyle}>{unit}</span>}
      </div>
      {(hasMeta || hasVisual) && (
        <div style={visualRowStyle}>
          <div style={trendSubStyle}>
            {trend && <span style={trendStyle}>{trend}</span>}
            {sub && <span style={subStyle}>{sub}</span>}
          </div>
          {sparkData && sparkData.length > 0 && (
            <Sparkline data={sparkData} color={sparkColor} />
          )}
          {donutValue !== undefined && <DonutRing value={donutValue} />}
          {icon && !sparkData && donutValue === undefined && (
            <span style={iconContainerStyle}>{icon}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
