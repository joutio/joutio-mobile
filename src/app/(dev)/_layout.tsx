import { Stack } from 'expo-router'
import { largeTitleOptions, nativeHeaderOptions, useTheme } from '@/design-system'

/** Catalogue et aperçus : réservés aux administrateurs connectés dans le layout racine. */
export default function DevLayout() {
  const theme = useTheme()
  return (
    <Stack screenOptions={nativeHeaderOptions(theme)}>
      <Stack.Screen name="catalog/index" options={{ title: 'Catalogue', ...largeTitleOptions }} />
      <Stack.Screen name="catalog/[id]" options={{ headerBackTitle: 'Catalogue' }} />
      <Stack.Screen name="preview/[step]" options={{ headerShown: false }} />
      <Stack.Screen name="tabs" options={{ headerShown: false }} />
    </Stack>
  )
}
