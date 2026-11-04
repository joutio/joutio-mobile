import { View } from 'react-native'
import { ForceDark, SplashLogo, useTheme } from '@/design-system'

function Body() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <SplashLogo />
    </View>
  )
}

/** Lancement, toujours sombre : affiché le temps de restaurer la session (1,2 s au plus en pratique). */
export function LaunchScreen() {
  return (
    <ForceDark>
      <Body />
    </ForceDark>
  )
}
