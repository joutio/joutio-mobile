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

/** Lancement, toujours sombre : au moins 1,2 s (`LAUNCH_MIN_MS`), puis le temps de restaurer la session. */
export function LaunchScreen() {
  return (
    <ForceDark>
      <Body />
    </ForceDark>
  )
}
