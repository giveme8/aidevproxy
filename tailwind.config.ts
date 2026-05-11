import type { Config } from "tailwindcss";
import { tokens } from "./src/styles/design-tokens";

const c = tokens.colors;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface-window": c.bg.window,
        "surface-sidebar": c.bg.sidebar,
        "surface-canvas": c.bg.canvas,
        "surface-card": c.bg.card,
        "surface-card-2": c.bg.card2,
        "surface-card-hover": c.bg.cardHover,
        "content-primary": c.text.primary,
        "content-secondary": c.text.secondary,
        "content-tertiary": c.text.tertiary,
        "content-muted": c.text.muted,
        "edge-default": c.border.default,
        "edge-strong": c.border.strong,
        green: c.accent.green,
        "green-bright": c.accent.greenBright,
        "green-soft": c.accent.greenSoft,
        "green-glow": c.accent.greenGlow,
        yellow: c.accent.yellow,
        orange: c.accent.orange,
        red: c.accent.red,
        blue: c.accent.blue,
        purple: c.accent.purple,
      },
      borderRadius: {
        sm: tokens.radii.sm,
        md: tokens.radii.md,
        lg: tokens.radii.lg,
        xl: tokens.radii.xl,
      },
      boxShadow: {
        sm: tokens.shadows.sm,
        md: tokens.shadows.md,
        lg: tokens.shadows.lg,
        glow: tokens.shadows.glow,
      },
      fontFamily: {
        sans: tokens.typography.fontFamily,
        mono: tokens.typography.fontFamilyMono,
      },
      fontSize: {
        ...tokens.typography.sizes,
      },
      fontWeight: {
        ...tokens.typography.weights,
      },
    },
  },
  plugins: [],
} satisfies Config;
