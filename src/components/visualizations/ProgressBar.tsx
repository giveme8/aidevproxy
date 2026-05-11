interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  bg?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color = "#22c55e",
  height = 4,
  bg = "#1d2926",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div
      style={{
        width: "100%",
        height,
        background: bg,
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: height / 2,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}
