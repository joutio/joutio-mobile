import { Stack } from 'expo-router'
import { nativeHeaderOptions, useTheme } from '@/design-system'
import { useT } from '@/lib/i18n'

/** Entrée du groupe quand la navigation y bascule (`Stack.Protected`). */
export const unstable_settings = { anchor: 'login' }

export default function AuthLayout() {
  const t = useT()
  const theme = useTheme()
  return (
    <Stack screenOptions={nativeHeaderOptions(theme)}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      {/* Le retour nomme la page précédente par son type (`navigation.md`). */}
      <Stack.Screen name="code" options={{ title: '', headerBackTitle: t('onboarding.code.back') }} />
    </Stack>
  )
}
