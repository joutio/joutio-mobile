import { Stack } from 'expo-router'
import { useTheme } from '@/design-system'

/** Pile de l'onglet Profil : Série, Réglages et les pages complètes s'ouvrent par-dessus, la barre d'onglets est masquée (seule la racine l'affiche, `JoTabBar`). */
export default function ProfileStack() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
