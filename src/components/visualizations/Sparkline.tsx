interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  strokeWidth?: number;
}

export default function Sparkline({
  data,
  color = "#22c55e",
  width = 120,
  height = 36,
  fill = true,
  strokeWidth = 1.6,
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const getX = (index: number): number =>
    data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;

  const getY = (value: number): number =>
    height - ((value - min) / range) * (height - 2 * strokeWidth) - strokeWidth;

  const gradientId = `sparkline-grad-${Math.random().toString(36).slice(2, 9)}`;

  const linePath = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${getX(i)} ${getY(v)}`)
    .join(" ");

  const areaPath = fill
    ? `${linePath} L${getX(data.length - 1)} ${height} L${getX(0)} ${height} Z`
    : undefined;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
