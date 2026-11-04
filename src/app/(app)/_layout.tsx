import { Stack } from 'expo-router'
import { nativeHeaderOptions, useTheme } from '@/design-system'

export const unstable_settings = { anchor: '(tabs)' }

/** Écrans du joueur connecté : les 5 onglets, puis les écrans poussés par-dessus. */
export default function AppLayout() {
  const theme = useTheme()
  return (
    <Stack screenOptions={nativeHeaderOptions(theme)}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  )
}
