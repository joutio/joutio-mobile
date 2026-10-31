/**
 * Jetons Joutio — source : `design/tokens.json` (design system 2.1).
 *
 * Les couleurs de catégories sont exposées en hex sRGB pour React Native
 * (oklch n'est pas encore fiable sur toutes les versions d'Android).
 */

export const palette = {
  dark: {
    bg: "#000000",
    canvas: "#0C0C0B",
    surface: "#181818",
    raised: "#1F1F1F",
    hover: "#272727",
    border: "#313131",
    warm: "#131209",
    text: "#FFFFFF",
    muted: "#9B9B9B",
    accent: "#E8B04A",
    accentPress: "#C9963C",
    accentInk: "#E8B04A",
    onAccent: "#000000",
    correct: "#4FB286",
    wrong: "#E5645A",
    glass: "rgba(10,10,10,0.72)",
    scrim: "rgba(0,0,0,0.6)",
  },
  light: {
    bg: "#F6F5F1",
    canvas: "#DEDBD2",
    surface: "#FFFFFF",
    raised: "#EFEDE7",
    hover: "#E5E2DA",
    border: "#D9D6CD",
    warm: "#EEE9DC",
    text: "#121210",
    muted: "#64625C",
    accent: "#E8B04A",
    accentPress: "#C9963C",
    accentInk: "#8A5E0F",
    onAccent: "#000000",
    correct: "#2E8A5F",
    wrong: "#C2433A",
    glass: "rgba(246,245,241,0.8)",
    scrim: "rgba(18,18,16,0.4)",
  },
} as const;

export type Palette = (typeof palette)["dark"];

export const tiers = {
  FER: { label: "Fer", hex: "#3F444C" },
  BRONZE: { label: "Bronze", hex: "#B86A32" },
  ARGENT: { label: "Argent", hex: "#8C95A3" },
  OR: { label: "Or", hex: "#D9A826" },
  PLATINE: { label: "Platine", hex: "#8C9FC9" },
  EMERAUDE: { label: "Émeraude", hex: "#2FBF77" },
  DIAMANT: { label: "Diamant", hex: "#5DB4E2" },
} as const;

export type TierCode = keyof typeof tiers;

export const categories = {
  SPORTS: { label: "Sport", hex: "#46C6CD", icon: "volleyball" },
  EDUCATION: { label: "Éducation", hex: "#4DC3DD", icon: "graduation-cap" },
  SCIENCE: { label: "Science", hex: "#5DBEE9", icon: "flask" },
  TECHNOLOGY: { label: "Technologie", hex: "#79B6F4", icon: "cpu" },
  ENTERTAINMENT: { label: "Divertissement", hex: "#96AEF7", icon: "star" },
  LITERATURE: { label: "Littérature", hex: "#B0A5F2", icon: "book-open-text" },
  ARTS: { label: "Arts", hex: "#C79DE6", icon: "palette" },
  MUSIC: { label: "Musique", hex: "#D997D2", icon: "headphones" },
  MOVIES: { label: "Cinéma", hex: "#E694BB", icon: "film-slate" },
  TELEVISION: { label: "Télévision", hex: "#EC93A8", icon: "television-simple" },
  FOOD_AND_DRINK: { label: "Gastronomie", hex: "#ED997B", icon: "pizza" },
  HISTORY: { label: "Histoire", hex: "#E79E6B", icon: "bank" },
  GAMES: { label: "Jeux", hex: "#BBB55E", icon: "game-controller" },
  NATURE: { label: "Nature", hex: "#A1BD6E", icon: "leaf" },
  BUSINESS: { label: "Business", hex: "#5FC8A6", icon: "briefcase" },
  WORLD: { label: "Monde", hex: "#4DC8BA", icon: "globe-hemisphere-west" },
  GENERAL: { label: "Culture générale", hex: "#B1B1B1", icon: "lightbulb" },
} as const;

export type CategoryCode = keyof typeof categories;

export const typography = {
  display: { font: "sans", size: 48, lineHeight: 48, weight: 700, letterSpacing: -0.03 },
  largeTitle: { font: "sans", size: 30, lineHeight: 36, weight: 700, letterSpacing: -0.02 },
  title1: { font: "sans", size: 24, lineHeight: 32, weight: 700, letterSpacing: -0.02 },
  title2: { font: "sans", size: 20, lineHeight: 28, weight: 600, letterSpacing: -0.01 },
  headline: { font: "sans", size: 16, lineHeight: 24, weight: 600, letterSpacing: 0 },
  body: { font: "sans", size: 16, lineHeight: 24, weight: 400, letterSpacing: 0 },
  callout: { font: "sans", size: 14, lineHeight: 20, weight: 500, letterSpacing: 0 },
  footnote: { font: "sans", size: 12, lineHeight: 16, weight: 400, letterSpacing: 0 },
  caption: { font: "sans", size: 12, lineHeight: 16, weight: 600, letterSpacing: 0 },
  numeric: { font: "mono", size: 24, lineHeight: 32, weight: 600, letterSpacing: 0 },
} as const;

export type TypographyToken = keyof typeof typography;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
} as const;

export const motion = {
  base: { duration: 500, easing: [0.22, 1, 0.36, 1] as const },
  micro: { duration: 250, easing: [0.22, 1, 0.36, 1] as const },
  exit: { duration: 300, easing: [0.55, 0, 0.85, 0.2] as const },
  celebration: { duration: 700, easing: [0.34, 1.56, 0.64, 1] as const },
  timer: { duration: 10000, easing: "linear" as const },
} as const;

export const haptic = {
  selection: "selection",
  light: "impactLight",
  medium: "impactMedium",
  heavy: "impactHeavy",
  success: "notificationSuccess",
  warning: "notificationWarning",
  error: "notificationError",
} as const;

function normalizeCategory(code: string): CategoryCode | null {
  const key = code?.toUpperCase() as CategoryCode;
  return key in categories ? key : null;
}

export function categoryHex(code: string): string {
  const key = normalizeCategory(code);
  return key ? categories[key].hex : categories.GENERAL.hex;
}

export function categoryLabel(code: string, fallback?: string): string {
  const key = normalizeCategory(code);
  return key ? categories[key].label : (fallback ?? code);
}

export function categoryIcon(code: string): string {
  const key = normalizeCategory(code);
  return key ? categories[key].icon : categories.GENERAL.icon;
}

export function tierHex(code: string): string {
  const key = code?.toUpperCase() as TierCode;
  return key in tiers ? tiers[key].hex : tiers.FER.hex;
}

export function tierLabel(code: string): string {
  const key = code?.toUpperCase() as TierCode;
  return key in tiers ? tiers[key].label : tiers.FER.label;
}
