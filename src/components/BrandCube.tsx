interface BrandCubeProps {
  size?: number;
  glow?: boolean;
}

export default function BrandCube({ size = 36, glow = true }: BrandCubeProps) {
  return (
    <div
      className="inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        <defs>
          <linearGradient id="bc-top" x1="36" y1="8" x2="36" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="bc-left" x1="22" y1="16" x2="22" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="bc-right" x1="50" y1="16" x2="50" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#0f6327" />
          </linearGradient>
          {glow && (
            <filter id="bc-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22c55e" floodOpacity="0.45" />
            </filter>
          )}
        </defs>

        <g filter={glow ? "url(#bc-glow)" : undefined}>
          {/* Top face */}
          <polygon
            points="36,8 50,16 36,24 22,16"
            fill="url(#bc-top)"
            stroke="#4ade80"
            strokeWidth="0.5"
            strokeOpacity="0.6"
          />
          {/* Left face */}
          <polygon
            points="22,16 36,24 36,40 22,32"
            fill="url(#bc-left)"
            stroke="#22c55e"
            strokeWidth="0.5"
            strokeOpacity="0.5"
          />
          {/* Right face */}
          <polygon
            points="36,24 50,16 50,32 36,40"
            fill="url(#bc-right)"
            stroke="#16a34a"
            strokeWidth="0.5"
            strokeOpacity="0.5"
          />
        </g>
      </svg>
    </div>
  );
}
