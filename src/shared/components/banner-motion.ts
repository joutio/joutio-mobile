import { Easing, LinearTransition, withTiming, type EntryAnimationsValues, type ExitAnimationsValues } from 'react-native-reanimated'

/**
 * Bandeaux du haut (connexion, partie en cours ; `design/specs/components/feedback.md`, 2026-11-14) : la bande arrive du
 * haut (translation de -100 % à 0, fondu) pendant que l'écran dessous descend avec elle (`BANNER_LAYOUT`), et à la sortie
 * le mouvement s'inverse. 800 ms, ease-in-out `cubic-bezier(0.65, 0, 0.35, 1)` : la courbe `base` est trop brusque au
 * départ, on ne verrait pas la barre du haut s'abaisser. Mouvement réduit : apparition sèche (comportement par défaut
 * des animations de layout de Reanimated).
 */
const BANNER_MS = 800
const easing = Easing.bezier(0.65, 0, 0.35, 1)
const config = { duration: BANNER_MS, easing }

export const BANNER_ENTER = (values: EntryAnimationsValues) => {
  'worklet'
  return {
    initialValues: { opacity: 0, originY: values.targetOriginY - values.targetHeight },
    animations: { opacity: withTiming(1, config), originY: withTiming(values.targetOriginY, config) },
  }
}

export const BANNER_EXIT = (values: ExitAnimationsValues) => {
  'worklet'
  return {
    initialValues: { opacity: 1, originY: values.currentOriginY },
    animations: { opacity: withTiming(0, config), originY: withTiming(values.currentOriginY - values.currentHeight, config) },
  }
}

export const BANNER_LAYOUT = LinearTransition.duration(BANNER_MS).easing(easing)
