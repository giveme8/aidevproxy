interface AreaChartProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  xLabels?: string[];
  yMax?: number;
}

const PAD = { left: 32, right: 8, top: 12, bottom: 18 };

export default function AreaChart({
  data,
  color = "#22c55e",
  width = 360,
  height = 130,
  xLabels,
  yMax: yMaxProp,
}: AreaChartProps) {
  if (!data || data.length === 0) return null;

  const chartH = height - PAD.top - PAD.bottom;
  const chartW = width - PAD.left - PAD.right;

  const maxVal = yMaxProp ?? Math.max(...data, 0);
  const minVal = 0;

  const gradientId = `area-grad-${Math.random().toString(36).slice(2, 9)}`;
  const glowId = `glow-${Math.random().toString(36).slice(2, 9)}`;

  const getX = (i: number): number =>
    data.length === 1
      ? PAD.left + chartW / 2
      : PAD.left + (i / (data.length - 1)) * chartW;

  const getY = (v: number): number => {
    const ratio = (v - minVal) / (maxVal - minVal || 1);
    return PAD.top + chartH - ratio * chartH;
  };

  // Build line path
  const linePath = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${getX(i)} ${getY(v)}`)
    .join(" ");

  // Build area path
  const areaPath = `${linePath} L${getX(data.length - 1)} ${
    PAD.top + chartH
  } L${getX(0)} ${PAD.top + chartH} Z`;

  // Last point
  const lastX = getX(data.length - 1);
  const lastY = getY(data[data.length - 1]);

  // Grid line percentages
  const gridRatios = [0, 0.33, 0.66, 1];
  const gridLines = gridRatios.map((ratio) => {
    const y = PAD.top + chartH * (1 - ratio);
    const val = Math.round((maxVal - minVal) * ratio + minVal);
    return { y, label: String(val) };
  });

  // X-axis labels
  const renderXLabels =
    xLabels && xLabels.length > 0 && xLabels.length === data.length;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map((g) => (
        <g key={g.y}>
          <line
            x1={PAD.left}
            y1={g.y}
            x2={PAD.left + chartW}
            y2={g.y}
            stroke="#2a2d35"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            x={PAD.left - 6}
            y={g.y + 4}
            textAnchor="end"
            fill="#9ba1b0"
            fontSize={10}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            {g.label}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Endpoint glow circle */}
      <circle
        cx={lastX}
        cy={lastY}
        r={8}
        fill={`url(#${glowId})`}
      />

      {/* Endpoint dot */}
      <circle
        cx={lastX}
        cy={lastY}
        r={3.5}
        fill={color}
      />

      {/* X-axis labels */}
      {renderXLabels &&
        xLabels!.map((label, i) => (
          <text
            key={i}
            x={getX(i)}
            y={height - 4}
            textAnchor="middle"
            fill="#9ba1b0"
            fontSize={9}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            {label}
          </text>
        ))}
    </svg>
  );
}
