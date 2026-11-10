import { Stack } from 'expo-router'
import { useTheme } from '@/design-system'

/** Pile de l'onglet Social : fiche joueur et historique s'ouvrent par-dessus, la barre d'onglets est masquée (seule la racine l'affiche, `JoTabBar`). */
export default function SocialStack() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
