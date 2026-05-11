import React from "react";

interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export default function TextInput({
  value,
  onChange,
  placeholder,
  icon,
  suffix,
  style,
  ...rest
}: TextInputProps) {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    background: "var(--bg-canvas)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    ...style,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: 13,
    color: "var(--text-primary)",
    minWidth: 0,
    fontFamily: "inherit",
  };

  const iconStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    color: "var(--text-tertiary)",
    fontSize: 14,
    flexShrink: 0,
  };

  const suffixStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      {icon && <span style={iconStyle}>{icon}</span>}
      <input
        style={inputStyle}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        {...rest}
      />
      {suffix && <span style={suffixStyle}>{suffix}</span>}
    </div>
  );
}
