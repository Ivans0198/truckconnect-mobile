// Tokens leídos de las clases Tailwind de docs/mockups/*.html (valores exactos
// de la paleta de Tailwind, no estimados). design-system.md los documenta.

export const palette = {
  white: "#FFFFFF",
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate700: "#334155",
  slate900: "#0F172A",
  blue50: "#EFF6FF",
  blue600: "#2563EB",
  blue700: "#1D4ED8",
  blue900: "#1E3A8A",
  blue100: "#DBEAFE",
  blue200: "#BFDBFE",
  emerald50: "#ECFDF5",
  emerald100: "#D1FAE5",
  emerald500: "#10B981",
  emerald700: "#047857",
  amber50: "#FFFBEB",
  amber100: "#FEF3C7",
  amber500: "#F59E0B",
  amber700: "#B45309",
  red50: "#FEF2F2",
  red100: "#FEE2E2",
  red200: "#FECACA",
  red500: "#EF4444",
  red600: "#DC2626",
  red700: "#B91C1C",
  sky900: "#0C4A6E",
  sky800: "#075985",
  sky700: "#0369A1",
  sky600: "#0284C7",
  violet600: "#7C3AED",
} as const;

export const colors = {
  primary: palette.blue600,
  primaryPressed: palette.blue700,
  background: palette.slate50,
  surface: palette.white,
  border: palette.slate200,
  text: palette.slate900,
  textMuted: palette.slate500,
  onPrimary: palette.white,
} as const;

// El semáforo de docs/CLAUDE_MOBILE.md: cada estado tiene fondo, acento y
// texto legible sobre ese fondo.
export const semantic = {
  success: {
    background: palette.emerald50,
    accent: palette.emerald500,
    text: palette.emerald700,
  },
  warning: {
    background: palette.amber50,
    accent: palette.amber500,
    text: palette.amber700,
  },
  danger: {
    background: palette.red50,
    accent: palette.red500,
    text: palette.red700,
  },
  info: {
    background: palette.blue50,
    accent: palette.blue600,
    text: palette.blue700,
  },
} as const;

export type SemanticTone = keyof typeof semantic;

// Degradado de la pantalla de login (09_driver_login.html).
export const brandGradient = [
  palette.sky900,
  palette.sky800,
  palette.sky700,
  palette.sky600,
] as const;

// Capas translúcidas sobre el degradado del login (clases bg-white/10 y
// border-white/20 del mockup 09).
export const loginOverlay = {
  field: "rgba(255, 255, 255, 0.10)",
  fieldFocused: "rgba(255, 255, 255, 0.15)",
  border: "rgba(255, 255, 255, 0.20)",
  borderFocused: "rgba(255, 255, 255, 0.40)",
} as const;

// Fondo que atenúa la pantalla detrás de un diálogo (slate-900 al 50%).
export const scrim = "rgba(15, 23, 42, 0.50)";

export const radius = { md: 8, lg: 12, xl: 16, full: 9999 } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// El conductor maneja: nada tocable por debajo de 60px, nada leído por debajo de 16.
export const TOUCH_TARGET_MIN = 60;

export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

export const fontSize = { body: 16, lead: 18, title: 24, display: 30 } as const;
