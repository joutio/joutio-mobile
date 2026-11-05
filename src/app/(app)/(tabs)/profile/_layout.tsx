import { Stack } from 'expo-router'
import { useTheme } from '@/design-system'

/** Pile de l'onglet Profil : Récompenses, Série, Réglages et les pages complètes s'ouvrent par-dessus, la barre d'onglets reste visible. */
export default function ProfileStack() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
