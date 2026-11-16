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

/**
 * Fond des surfaces basses qui portent des actions (barre d'actions d'un écran, saisie du chat) : **la couleur de la
 * barre d'onglets Android** (`JoTabBar`, teinte `glass` sur le fond de l'écran), opaque, que la barre soit posée sous le
 * contenu ou par-dessus.
 */
export function BottomBarBackground() {
  const { colors } = useTheme()
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <GlassBackground />
    </View>
  )
}
