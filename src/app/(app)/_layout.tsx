import { Stack } from 'expo-router'
import { largeTitleOptions, nativeHeaderOptions, useTheme } from '@/design-system'

export const unstable_settings = { anchor: 'home' }

export default function AppLayout() {
  const theme = useTheme()
  return (
    <Stack screenOptions={nativeHeaderOptions(theme)}>
      <Stack.Screen name="home" options={{ title: 'Accueil', ...largeTitleOptions }} />
    </Stack>
  )
}
