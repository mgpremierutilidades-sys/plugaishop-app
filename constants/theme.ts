// constants/theme.ts

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Mantemos o shape “Colors.light/dark.*” para compatibilidade com arquivos antigos.
 */
export const Colors = {
  light: {
    text: "#0F172A",
    background: "#F7F8FA",
    tint: "#16A34A",
    icon: "#94A3B8",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#16A34A",
  },
  dark: {
    text: "#E5E7EB",
    background: "#0B1220",
    tint: "#22C55E",
    icon: "#94A3B8",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#22C55E",
  },
} as const;

const theme = {
  colors: {
    background: "#F7F8FA",
    backgroundSoft: "#EEF1F5",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F3F6",
    divider: "#E6E8EC",
    border: "#E6E8EC",

    // textos (inclui aliases)
    text: "#0F172A",
    textMuted: "#64748B",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",

    // Alias exigido por alguns componentes (ex.: OrderTimeline)
    muted: "#94A3B8",

    // Alias extra (opcional, mas ajuda compatibilidade sem quebrar nada)
    mutedText: "#64748B",

    primary: "#16A34A",
    primarySoft: "#DCFCE7",

    success: "#16A34A",
    successSoft: "#DCFCE7",

    warning: "#F59E0B",
    warningSoft: "#FEF3C7",

    danger: "#EF4444",
    dangerSoft: "#FEE2E2",

    tabIconActive: "#16A34A",
    tabIconInactive: "#94A3B8",
  },

  spacing: Spacing,
  radius: Radius,

  typography: {
    h1: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const },
    h2: { fontSize: 22, lineHeight: 28, fontWeight: "800" as const },
    h3: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const },

    // Alias que o Profile está pedindo:
    sectionTitle: { fontSize: 14, lineHeight: 18, fontWeight: "800" as const },

    title: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const },
    subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
    body: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
    bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
    button: { fontSize: 14, lineHeight: 18, fontWeight: "700" as const },
  },
} as const;

export default theme;
