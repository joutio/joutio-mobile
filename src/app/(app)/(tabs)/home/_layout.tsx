import { Stack } from 'expo-router'
import { useTheme } from '@/design-system'

/** Pile de l'onglet Accueil : la Fiche sujet s'ouvre par-dessus, la barre d'onglets reste visible. */
export default function HomeStack() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
