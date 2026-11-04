import { type StyleProp, type ViewStyle } from 'react-native'
import { useReducedMotion } from '../motion'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { VerifiedShine } from '../vendor/reacticx/micro-interactions/verified-shine'

export interface PremiumBadgeProps {
  /** Côté en pt, calé sur la ligne du pseudonyme (18 pour `headline`, 22 pour `title2`). */
  size?: number
  style?: StyleProp<ViewStyle>
}

/** Reflet blanc qui balaie le badge, quel que soit le thème. */
const SHINE = tokens.color.dark.text
const SHINE_COLORS = ['transparent', alpha(SHINE, 0.15), alpha(SHINE, 0.85), alpha(SHINE, 0.15), 'transparent']

/**
 * Marque des joueurs **Premium**, à droite du pseudonyme partout où un joueur est nommé (`marque.md` § PremiumBadge).
 * Badge certifié de Reacticx (`verified-shine`, copié dans `vendor/`) aux couleurs des tokens : fond `accent`, coche
 * `onAccent`, reflet qui passe toutes les 2 s environ ; immobile sous mouvement réduit.
 */
export function PremiumBadge({ size = 18, style }: PremiumBadgeProps) {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  return (
    <VerifiedShine size={size} color={colors.accent} checkColor={colors.onAccent} shineColors={SHINE_COLORS} paused={reduced} label="Premium" style={style} />
  )
}
