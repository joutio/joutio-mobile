import { createContext, useContext, useMemo } from "react";
import { Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { setItem } from "@/lib/storage";
import { palette } from "./tokens";

export const ACCENT = palette.dark.accent;

export type Appearance = "dark" | "light" | "system";

const APPEARANCE_KEY = "joutio.appearance";

interface AppearanceState {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
}

/** Lecture synchrone : sinon le premier rendu clignote dans le mauvais thème. */
function storedAppearance(): Appearance {
  if (Platform.OS === "web") return "system";
  try {
    const value = SecureStore.getItem(APPEARANCE_KEY);
    return value === "dark" || value === "light" ? value : "system";
  } catch {
    return "system";
  }
}

/** Réglages › Apparence, conservé sur l'appareil. */
export const useAppearanceStore = create<AppearanceState>((set) => ({
  appearance: storedAppearance(),
  setAppearance: (appearance) => {
    set({ appearance });
    void setItem(APPEARANCE_KEY, appearance);
  },
}));

const ForcedDark = createContext(false);

/** Force la palette sombre : écrans immersifs de duel. */
export const DarkTheme = ForcedDark.Provider;

export interface NativeTheme {
  isIOS: boolean;
  isAndroid: boolean;
  dark: boolean;
  colors: {
    background: string;
    canvas: string;
    surface: string;
    surfaceElevated: string;
    raised: string;
    grouped: string;
    label: string;
    secondaryLabel: string;
    tertiaryLabel: string;
    separator: string;
    fill: string;
    accent: string;
    accentPress: string;
    accentInk: string;
    accentSoft: string;
    hover: string;
    accentText: string;
    onAccent: string;
    warm: string;
    border: string;
    glass: string;
    shadow: string;
    scrim: string;
    danger: string;
    dangerSoft: string;
    success: string;
    warning: string;
    header: string;
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  spacing: {
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
    huge: number;
    giant: number;
  };
}

/**
 * Tokens natifs Joutio. Le jeu est sombre par défaut ; les réglages et les
 * surfaces institutionnelles suivent le thème système (design system 2.1).
 */
export function useNativeTheme(): NativeTheme {
  // Les deux thèmes du design system sont supportés : on suit l'apparence
  // système (Expo Go / appareil), avec la palette claire ou sombre.
  const forcedDark = useContext(ForcedDark);
  const scheme = useColorScheme();
  const appearance = useAppearanceStore((state) => state.appearance);
  const dark =
    forcedDark ||
    appearance === "dark" ||
    (appearance === "system" && scheme === "dark");
  const isIOS = Platform.OS === "ios";

  return useMemo(() => {
    const p = dark ? palette.dark : palette.light;
    return {
      isIOS,
      isAndroid: !isIOS,
      dark,
      colors: {
        background: p.bg,
        canvas: p.canvas,
        surface: p.surface,
        surfaceElevated: p.raised,
        raised: p.raised,
        grouped: p.surface,
        label: p.text,
        secondaryLabel: p.muted,
        tertiaryLabel: p.muted,
        separator: p.border,
        fill: p.raised,
        accent: p.accent,
        accentPress: p.accentPress,
        accentInk: p.accentInk,
        accentSoft: dark ? "rgba(232,176,74,0.16)" : "rgba(232,176,74,0.20)",
        hover: p.hover,
        accentText: p.onAccent,
        onAccent: p.onAccent,
        warm: p.warm,
        border: p.border,
        glass: p.glass,
        shadow: p.shadow,
        scrim: p.scrim,
        danger: p.wrong,
        dangerSoft: dark ? "rgba(229,100,90,0.18)" : "rgba(194,67,58,0.12)",
        success: p.correct,
        warning: p.accent,
        header: dark ? "rgba(12,12,11,0.88)" : "rgba(246,245,241,0.88)",
      },
      radius: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        pill: 9999,
      },
      spacing: {
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
      },
    };
  }, [dark, isIOS]);
}
