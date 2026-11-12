import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Marge à laisser en bas d'un contenu défilant (2026-11-12). iOS : tab bar **native** flottante, comprise dans la zone
 * sûre de l'onglet — le contenu passe dessous et finit au-dessus (hors onglet : l'indicateur d'accueil). Android :
 * `JoTabBar` occupe sa propre place, rien à ajouter.
 */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets()
  return Platform.OS === 'ios' ? insets.bottom : 0
}

/** Ajoute `extra` au padding bas d'un style de contenu (`paddingBottom`, sinon `paddingVertical`, sinon `padding`). */
export function withBottomInset(style: StyleProp<ViewStyle>, extra: number): StyleProp<ViewStyle> {
  if (!extra) return style
  const flat = StyleSheet.flatten(style) ?? {}
  const base = flat.paddingBottom ?? flat.paddingVertical ?? flat.padding
  return [style, { paddingBottom: (typeof base === 'number' ? base : 0) + extra }]
}

/**
 * Marge basse portée par le défilement natif (`contentInset` iOS) plutôt qu'un padding : `UIScrollView` la connaît
 * (`adjustedContentInset`), donc l'indicateur de défilement et le loader de `DragToLoadMore` restent au-dessus de la
 * tab bar native au lieu d'être dessinés dessous. Rien sur Android (marge nulle).
 */
export function tabBarScrollInsets(inset: number) {
  return inset > 0 ? { contentInset: { bottom: inset }, scrollIndicatorInsets: { bottom: inset } } : {}
}
