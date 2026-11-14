import {
  Easing,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  type LayoutAnimationsValues,
} from 'react-native-reanimated'

/**
 * Bandeaux du haut (connexion, partie en cours ; `design/specs/components/feedback.md`, 2026-11-14) : la bande arrive du
 * haut (translation de -100 % à 0, fondu) pendant que l'écran dessous descend avec elle (`bannerLayout`), et à la sortie
 * le mouvement s'inverse. 800 ms, ease-in-out `cubic-bezier(0.65, 0, 0.35, 1)` : la courbe `base` est trop brusque au
 * départ, on ne verrait pas la barre du haut s'abaisser. Mouvement réduit : apparition sèche (comportement par défaut
 * des animations de layout de Reanimated).
 */
export const BANNER_MS = 800
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

/**
 * Transition de l'écran sous la bande. La safe area haute bascule d'un coup (la bande la prend à son compte) : sans
 * compensation, le contenu des écrans remontait de sa hauteur avant de redescendre avec la bande (2026-11-14).
 * - Prise de la safe area (l'écran part de 0) : on démarre à `safeTop`, là où le contenu se trouvait déjà, puis on
 *   descend jusqu'à la bande.
 * - Restitution (l'écran revient à 0, cale retirée) : saut sans animation, visuellement neutre.
 * - Sinon (bande qui sort vers la cale, changement de bande) : glissement simple.
 * Le bas de l'écran reste ancré : la hauteur suit l'origine.
 */
export function bannerLayout(safeTop: number) {
  return (values: LayoutAnimationsValues) => {
    'worklet'
    const bottom = values.currentOriginY + values.currentHeight
    const settle = values.targetOriginY < 0.5
    const startY = settle ? values.targetOriginY : values.currentOriginY < 0.5 ? safeTop : values.currentOriginY
    const duration = settle ? 0 : BANNER_MS
    const timing = { duration, easing }
    return {
      initialValues: {
        originX: values.targetOriginX,
        width: values.targetWidth,
        originY: startY,
        height: settle ? values.targetHeight : bottom - startY,
      },
      animations: {
        originY: withTiming(values.targetOriginY, timing),
        height: withTiming(values.targetHeight, timing),
      },
    }
  }
}
