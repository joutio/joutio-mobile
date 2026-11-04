import { BlurView } from 'expo-blur'
import { Platform, StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/theme-provider'

/**
 * Fond `glass` du lab (`bg-jo-glass backdrop-blur-xl`). iOS : flou natif sous la teinte. Android : teinte seule,
 * le flou y exige d'envelopper le contenu flouté (`BlurTargetView`) — exception native assumée.
 */
export function GlassBackground() {
  const { colors, scheme } = useTheme()
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Platform.OS === 'ios' && <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]} />
    </View>
  )
}
