import { Easing, LinearTransition, SlideInUp, SlideOutUp } from 'react-native-reanimated'
import { tokens } from '@/design-system'

const bezier = (points: readonly number[]) => Easing.bezier(points[0] ?? 0, points[1] ?? 0, points[2] ?? 1, points[3] ?? 1)
const enterEasing = bezier(tokens.motion.base.easing.points)
const exitEasing = bezier(tokens.motion.exit.easing.points)
/** Entrée un peu plus courte que `base` (500 ms) : la bande ne retarde pas la lecture de l'écran. */
const ENTER_MS = 320

/**
 * Bandeaux du haut (connexion, partie en cours, 2026-11-13) : la bande descend du haut de l'écran et remonte en
 * sortant ; l'écran dessous suit le mouvement (`BANNER_LAYOUT`) au lieu de sauter. Mouvement réduit : apparition sèche
 * (comportement par défaut des animations de layout de Reanimated).
 */
export const BANNER_ENTER = SlideInUp.duration(ENTER_MS).easing(enterEasing)
export const BANNER_EXIT = SlideOutUp.duration(tokens.motion.exit.duration).easing(exitEasing)
export const BANNER_LAYOUT = LinearTransition.duration(ENTER_MS).easing(enterEasing)
