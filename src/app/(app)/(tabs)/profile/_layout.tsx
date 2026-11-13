import { Stack } from 'expo-router'
import { useTheme } from '@/design-system'

/**
 * La racine de l'onglet reste sous toute page poussée (2026-11-13) : une pile reconstruite depuis une URL (lien, push
 * d'un autre onglet) garde un retour vers l'écran de l'onglet au lieu d'une page orpheline.
 */
export const unstable_settings = { anchor: 'index' }

/** Pile de l'onglet Profil : Série, Réglages et les pages complètes s'ouvrent par-dessus, la barre d'onglets reste visible. */
export default function ProfileStack() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
