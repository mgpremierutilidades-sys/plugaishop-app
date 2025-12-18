// constants/theme.ts
import type { TextStyle, ViewStyle } from "react-native";

/**
 * Plugaí Shop – Theme System (2026)
 * - Default export: theme
 * - Named exports: Colors, Radius, Spacing, ColorName
 *
 * IMPORTANT (project standard):
 * - Always import theme as default:
 *   import theme from "../../constants/theme";
 */

export const Colors = {
  // Surfaces
  background: "#F7F8FA",
  backgroundSoft: "#EEF1F5",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F3F6",
  divider: "#E6E8EC",
  border: "#E6E8EC",

  // Brand
  primary: "#2F6FED",
  primarySoft: "#E8EEFD",
  primaryDark: "#1E4FCC",

  // Prices / Success
  price: "#1FA971",
  priceStrong: "#15803D",
  success: "#22C55E",
  successSoft: "#DCFCE7",

  // Alerts
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",

  // Text
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textStrong: "#0F172A",
  textSoft: "#475569",
  text: "#0F172A",

  // Icons / Tabs
  icon: "#334155",
  tabIconActive: "#2F6FED",
  tabIconInactive: "#94A3B8",
} as const;

export type ColorName = keyof typeof Colors;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxxl: 48,
} as const;

type TypographyKey =
  | "h1"
  | "h2"
  | "h3"
  | "sectionTitle"
  | "body"
  | "bodyStrong"
  | "caption"
  | "badge"
  | "priceMain"
  | "priceOld"
  | "buttonLabel";

const Typography: Record<TypographyKey, TextStyle> = {
  h1: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  h2: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  h3: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: "400",
  },
  bodyStrong: {
    fontSize: 16,
    fontWeight: "700",
  },
  caption: {
    fontSize: 13,
    fontWeight: "400",
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
  },
  priceMain: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.priceStrong,
  },
  priceOld: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
};

const Shadows: Record<"card", ViewStyle> = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
};

const Layout: Record<"primaryButton", ViewStyle> = {
  primaryButton: {
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
};

const theme = {
  colors: Colors,
  spacing: Spacing,

  // Provide BOTH names to avoid runtime errors across legacy components.
  radius: Radius,
  radii: Radius,

  typography: Typography,
  shadows: Shadows,
  layout: Layout,
};

export default theme;
