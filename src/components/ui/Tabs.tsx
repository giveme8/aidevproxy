import React from "react";

interface TabsProps {
  items: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  underline?: boolean;
}

export default function Tabs({
  items,
  active,
  onChange,
  underline = true,
}: TabsProps) {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: 4,
    borderBottom: underline ? "1px solid var(--border)" : undefined,
  };

  return (
    <div style={containerStyle}>
      {items.map((item) => {
        const isActive = item.id === active;

        const tabStyle: React.CSSProperties = {
          padding: "10px 18px",
          fontSize: 13,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "#4ade80" : "var(--text-secondary)",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          borderBottom: isActive ? "2px solid #22c55e" : "2px solid transparent",
          boxShadow: isActive ? "0 0 6px #22c55e" : undefined,
          transition: "color 0.15s, border-color 0.15s, box-shadow 0.15s",
          whiteSpace: "nowrap",
        };

        return (
          <button
            key={item.id}
            style={tabStyle}
            onClick={() => onChange(item.id)}
            role="tab"
            aria-selected={isActive}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
