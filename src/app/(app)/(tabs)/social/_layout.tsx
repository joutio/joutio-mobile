import { Stack } from 'expo-router'
import { useTheme } from '@/design-system'

/** Pile de l'onglet Social : fiche joueur et historique s'ouvrent par-dessus, la barre d'onglets reste visible. */
export default function SocialStack() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
