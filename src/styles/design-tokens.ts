export interface ColorTokens {
  bg: {
    window: string;
    sidebar: string;
    canvas: string;
    card: string;
    card2: string;
    cardHover: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
  };
  border: {
    default: string;
    strong: string;
  };
  accent: {
    green: string;
    greenBright: string;
    greenSoft: string;
    greenGlow: string;
    yellow: string;
    orange: string;
    red: string;
    blue: string;
    purple: string;
  };
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface RadiiTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  glow: string;
}

export interface TypographyTokens {
  fontFamily: string;
  fontFamilyMono: string;
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  weights: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}

export interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
  shadows: ShadowTokens;
  typography: TypographyTokens;
}

export const tokens: DesignTokens = {
  colors: {
    bg: {
      window: '#0b0f0e',
      sidebar: '#0d1311',
      canvas: '#0f1614',
      card: '#131c19',
      card2: '#172220',
      cardHover: '#1b2724',
    },
    text: {
      primary: '#e8f5ef',
      secondary: '#9bb3ab',
      tertiary: '#5f7570',
      muted: '#3f524d',
    },
    border: {
      default: '#1d2926',
      strong: '#27332f',
    },
    accent: {
      green: '#22c55e',
      greenBright: '#4ade80',
      greenSoft: 'rgba(34,197,94,0.14)',
      greenGlow: 'rgba(74,222,128,0.45)',
      yellow: '#facc15',
      orange: '#fb923c',
      red: '#ef4444',
      blue: '#60a5fa',
      purple: '#a78bfa',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '48px',
  },
  radii: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
    glow: '0 0 20px rgba(74,222,128,0.15)',
  },
  typography: {
    fontFamily:
      "'Plus Jakarta Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontFamilyMono: "'JetBrains Mono', ui-monospace, monospace",
    sizes: {
      xs: '11px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '24px',
      '3xl': '28px',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
};

export function applyTokens(): void {
  const root = document.documentElement;
  const c = tokens.colors;
  const s = tokens.spacing;
  const r = tokens.radii;
  const sh = tokens.shadows;
  const t = tokens.typography;

  root.style.setProperty('--bg-window', c.bg.window);
  root.style.setProperty('--bg-sidebar', c.bg.sidebar);
  root.style.setProperty('--bg-canvas', c.bg.canvas);
  root.style.setProperty('--bg-card', c.bg.card);
  root.style.setProperty('--bg-card-2', c.bg.card2);
  root.style.setProperty('--bg-card-hover', c.bg.cardHover);
  root.style.setProperty('--border', c.border.default);
  root.style.setProperty('--border-strong', c.border.strong);
  root.style.setProperty('--text-primary', c.text.primary);
  root.style.setProperty('--text-secondary', c.text.secondary);
  root.style.setProperty('--text-tertiary', c.text.tertiary);
  root.style.setProperty('--text-muted', c.text.muted);
  root.style.setProperty('--green', c.accent.green);
  root.style.setProperty('--green-bright', c.accent.greenBright);
  root.style.setProperty('--green-soft', c.accent.greenSoft);
  root.style.setProperty('--green-glow', c.accent.greenGlow);
  root.style.setProperty('--yellow', c.accent.yellow);
  root.style.setProperty('--orange', c.accent.orange);
  root.style.setProperty('--red', c.accent.red);
  root.style.setProperty('--blue', c.accent.blue);
  root.style.setProperty('--purple', c.accent.purple);

  root.style.setProperty('--spacing-xs', s.xs);
  root.style.setProperty('--spacing-sm', s.sm);
  root.style.setProperty('--spacing-md', s.md);
  root.style.setProperty('--spacing-lg', s.lg);
  root.style.setProperty('--spacing-xl', s.xl);
  root.style.setProperty('--spacing-2xl', s['2xl']);
  root.style.setProperty('--spacing-3xl', s['3xl']);
  root.style.setProperty('--spacing-4xl', s['4xl']);

  root.style.setProperty('--radius-sm', r.sm);
  root.style.setProperty('--radius-md', r.md);
  root.style.setProperty('--radius-lg', r.lg);
  root.style.setProperty('--radius-xl', r.xl);
  root.style.setProperty('--radius-full', r.full);

  root.style.setProperty('--shadow-sm', sh.sm);
  root.style.setProperty('--shadow-md', sh.md);
  root.style.setProperty('--shadow-lg', sh.lg);
  root.style.setProperty('--shadow-glow', sh.glow);

  root.style.setProperty('--font-family', t.fontFamily);
  root.style.setProperty('--font-family-mono', t.fontFamilyMono);
  root.style.setProperty('--font-size-xs', t.sizes.xs);
  root.style.setProperty('--font-size-sm', t.sizes.sm);
  root.style.setProperty('--font-size-base', t.sizes.base);
  root.style.setProperty('--font-size-lg', t.sizes.lg);
  root.style.setProperty('--font-size-xl', t.sizes.xl);
  root.style.setProperty('--font-size-2xl', t.sizes['2xl']);
  root.style.setProperty('--font-size-3xl', t.sizes['3xl']);
  root.style.setProperty('--font-weight-normal', String(t.weights.normal));
  root.style.setProperty('--font-weight-medium', String(t.weights.medium));
  root.style.setProperty('--font-weight-semibold', String(t.weights.semibold));
  root.style.setProperty('--font-weight-bold', String(t.weights.bold));
}
