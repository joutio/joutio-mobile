import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'

/**
 * Décor uniquement : ne participe jamais à la mesure du chrome. Même épaisseur et couleur que la bordure de BottomNav.
 * Vue pleine d'un trait de haut, pas une bordure : une vue de hauteur nulle ne dessinait pas sa bordure sur iOS
 * (2026-11-12, aucun filet sous les onglets collés de l'Accueil).
 */
export function HeaderSeparator({ progress, inverse = false }: { progress?: SharedValue<number>; inverse?: boolean }) {
  const { colors } = useTheme()
  const opacity = useAnimatedStyle(() => ({ opacity: progress ? (inverse ? 1 - progress.value : progress.value) : 1 }))
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      style={[
        { position: 'absolute', left: 0, right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border },
        opacity,
      ]}
    />
  )
}
