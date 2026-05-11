import React, { useState, useRef, useCallback } from "react";

interface SelectProps {
  value: string;
  options: (string | { value: string; label: string })[];
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  size?: "sm" | "md";
}

function getLabel(option: string | { value: string; label: string }): string {
  if (typeof option === "string") return option;
  return option.label;
}

function getValue(option: string | { value: string; label: string }): string {
  if (typeof option === "string") return option;
  return option.value;
}

export default function Select({
  value,
  options,
  onChange,
  style,
  size = "md",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentLabel = options.find((o) => getValue(o) === value)
    ? getLabel(options.find((o) => getValue(o) === value)!)
    : value;

  const isSm = size === "sm";

  const triggerStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: isSm ? 12 : 13,
    padding: isSm ? "6px 10px" : "8px 14px",
    background: "var(--bg-card-2)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 500,
    ...style,
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    minWidth: "100%",
    marginTop: 4,
    background: "var(--bg-card-2)",
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    zIndex: 31,
    boxShadow: "0 6px 20px rgba(0,0,0,.3)",
    overflow: "hidden",
  };

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
  };

  const chevronStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--text-tertiary)",
    transition: "transform 0.15s",
    transform: open ? "rotate(180deg)" : "rotate(0deg)",
  };

  const optionStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "8px 14px",
    fontSize: 13,
    color: "var(--text-primary)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    whiteSpace: "nowrap",
    transition: "background 0.1s",
  };

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  };

  const handleSelect = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <div style={wrapperStyle}>
      <button
        ref={triggerRef}
        style={triggerStyle}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>{currentLabel}</span>
        <span style={chevronStyle}>&#9660;</span>
      </button>
      {open && (
        <>
          <div style={overlayStyle} onClick={() => setOpen(false)} />
          <div style={dropdownStyle}>
            {options.map((option) => {
              const optValue = getValue(option);
              const optLabel = getLabel(option);
              const isActive = optValue === value;
              const activeStyle: React.CSSProperties = isActive
                ? {
                    ...optionStyle,
                    color: "#4ade80",
                    background: "rgba(34,197,94,.08)",
                  }
                : optionStyle;

              return (
                <button
                  key={optValue}
                  style={activeStyle}
                  onClick={() => handleSelect(optValue)}
                  type="button"
                >
                  {optLabel}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
