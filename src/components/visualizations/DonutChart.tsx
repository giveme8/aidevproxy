interface DonutSegment {
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function DonutChart({
  data,
  size = 140,
  thickness = 18,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Accumulate segments
  let cumulativeRatio = 0;
  const segments = data.map((d) => {
    const ratio = d.value / total;
    const segment = {
      color: d.color,
      dashArray: `${(ratio * circumference).toFixed(2)} ${circumference}`,
      dashOffset: -(cumulativeRatio * circumference),
    };
    cumulativeRatio += ratio;
    return segment;
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", transform: "rotate(-90deg)" }}
    >
      {/* Background ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#1d2926"
        strokeWidth={thickness}
      />

      {/* Segments */}
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth={thickness}
          strokeDasharray={seg.dashArray}
          strokeDashoffset={seg.dashOffset}
        />
      ))}

      {/* Center text — rendered unrotated */}
      {(centerValue || centerLabel) && (
        <g transform={`rotate(90 ${center} ${center})`}>
          {centerValue && (
            <text
              x={center}
              y={center - 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={18}
              fontWeight={700}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text
              x={center}
              y={center + (centerValue ? 16 : 4)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#9ba1b0"
              fontSize={10}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              {centerLabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
