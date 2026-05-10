"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (!mounted) {
    return <span style={{ width: 40, height: 40 }} />;
  }

  return (
    <button
      onClick={toggle}
      aria-label="切换深色/浅色模式"
      style={{
        all: "unset",
        cursor: "pointer",
        width: 40,
        height: 40,
        display: "grid",
        placeItems: "center",
        borderRadius: 10,
        border: "1px solid var(--rule)",
        color: "var(--ink-dim)",
        fontSize: 18,
        transition: "background 0.15s, color 0.25s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--rule)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
