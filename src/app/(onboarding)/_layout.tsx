import { Stack } from 'expo-router'
import { useTheme } from '@/design-system'

/** Entrée du groupe quand la navigation y bascule (`Stack.Protected`). */
export const unstable_settings = { anchor: 'universes' }

export default function OnboardingLayout() {
  const { colors } = useTheme()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
}
