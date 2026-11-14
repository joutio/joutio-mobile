import { Easing } from 'react-native-reanimated'

/**
 * Bandeaux du haut (connexion, partie en cours ; `design/specs/components/feedback.md`) : 800 ms, ease-in-out
 * `cubic-bezier(0.65, 0, 0.35, 1)` ; la courbe `base` est trop brusque au départ, on ne verrait pas la barre du haut
 * s'abaisser. Mouvement réduit : apparition sèche (`ReduceMotion.System`).
 */
export const BANNER_MS = 800
export const BANNER_EASING = Easing.bezier(0.65, 0, 0.35, 1)
