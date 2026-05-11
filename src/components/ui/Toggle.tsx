import React from "react";

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
}

export function Toggle({ value, onChange, size = "md" }: ToggleProps) {
  const width = size === "sm" ? 32 : 38;
  const height = size === "sm" ? 18 : 22;
  const knobSize = height - 4;

  const containerStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: height / 2,
    cursor: "pointer",
    position: "relative",
    transition: "background 0.2s ease",
    background: value ? "#22c55e" : "#2a3934",
    boxShadow: value ? "0 0 10px rgba(34,197,94,.5)" : undefined,
    flexShrink: 0,
  };

  const knobStyle: React.CSSProperties = {
    width: knobSize,
    height: knobSize,
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,.3)",
    position: "absolute",
    top: 2,
    transition: "left 0.2s ease",
    left: value ? width - knobSize - 2 : 2,
  };

  return (
    <div
      style={containerStyle}
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!value);
        }
      }}
    >
      <div style={knobStyle} />
    </div>
  );
}

export default Toggle;
