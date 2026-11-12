import { StatusBar } from 'expo-status-bar'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { Appearance, useColorScheme } from 'react-native'
import { tokens, type CategoryCode, type ThemeName } from '../tokens.generated'
import { useThemeStore } from './theme-store'

export type ThemeColors = { [K in keyof typeof tokens.color.dark]: string }

export interface Theme {
  scheme: ThemeName
  colors: ThemeColors
  typography: typeof tokens.typography
  space: typeof tokens.space
  radius: typeof tokens.radius
  motion: typeof tokens.motion
  category: typeof tokens.category
  tier: typeof tokens.tier
  /** Couleur d'univers du thème : `color` en sombre, `colorLight` en clair (palettes du 2026-11-11). */
  categoryColor: (category: CategoryCode) => string
}

const buildTheme = (scheme: ThemeName): Theme => ({
  scheme,
  colors: tokens.color[scheme],
  typography: tokens.typography,
  space: tokens.space,
  radius: tokens.radius,
  motion: tokens.motion,
  category: tokens.category,
  tier: tokens.tier,
  categoryColor: (category) => (scheme === 'light' ? tokens.category[category].colorLight : tokens.category[category].color),
})

const THEMES: Record<ThemeName, Theme> = { dark: buildTheme('dark'), light: buildTheme('light') }

const ThemeContext = createContext<Theme | null>(null)

/** Thème de l'app : suit le système, sauf réglage manuel. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const preference = useThemeStore((state) => state.preference)
  const scheme: ThemeName = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference
  // Le réglage manuel s'applique aussi au natif (tab bar iOS, en-têtes, feuilles, alertes), qui suivrait sinon le
  // système ; « Système » rend la main à iOS / Android.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference)
  }, [preference])
  return <ThemeContext.Provider value={THEMES[scheme]}>{children}</ThemeContext.Provider>
}

/**
 * Force un thème pour un sous-arbre : `data-jo-theme` du lab. Les écrans toujours sombres (duel, intros,
 * déblocages, reconnexion), les boutons sur image, le curseur du Switch.
 */
export function ThemeScope({ scheme, children }: { scheme: ThemeName; children: ReactNode }) {
  return <ThemeContext.Provider value={THEMES[scheme]}>{children}</ThemeContext.Provider>
}

/**
 * Écran toujours sombre. Le chrome natif suit le sous-arbre : la barre d'état passe en icônes claires même quand le
 * thème système est clair (les écrans immersifs du lab portent `data-jo-theme="dark"` + `DarkChrome`).
 */
export const ForceDark = ({ children }: { children: ReactNode }) => (
  <ThemeScope scheme="dark">
    <StatusBar style="light" />
    {children}
  </ThemeScope>
)

export function useTheme(): Theme {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme() hors de <ThemeProvider>.')
  return theme
}
