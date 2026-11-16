import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

/**
 * Mouvement de la bande (`design/specs/components/feedback.md`) : 800 ms, ease-in-out `cubic-bezier(0.65, 0, 0.35, 1)` ;
 * la courbe `base` est trop brusque au départ, on ne verrait pas l'écran s'abaisser. Mouvement réduit : apparition
 * sèche (`ReduceMotion.System`).
 */
export const BANNER_MS = 800
export const BANNER_EASING = Easing.bezier(0.65, 0, 0.35, 1)

interface TopBannerState {
  /** Bande affichée (gardée pendant sa sortie), `null` sans bande. */
  kind: string | null
  /** La bande porte la safe area haute et sa cale : l'écran dessous n'en tient plus compte. */
  owned: boolean
  progress: SharedValue<number>
  /** Hauteur mesurée de la bande (safe area comprise), 0 tant qu'inconnue. */
  height: number
  onLayout: (event: LayoutChangeEvent) => void
  render: (kind: string, safeTop: number) => ReactNode
}

const TopBannerContext = createContext<TopBannerState | null>(null)

/**
 * Bande du haut globale (connexion, partie en cours ; `feedback.md`), comme le `GlobalBannerContext` du lab : le layout
 * choisit la bande, **chaque écran la porte dans sa propre mise en page** (`TopBannerFrame`). Rien n'enveloppe la
 * navigation : la barre d'onglets n'est jamais redimensionnée, la zone sûre n'est jamais réécrite, et une modale plein
 * écran porte sa bande comme les autres écrans. Une seule valeur d'animation : toutes les instances bougent ensemble.
 *
 * **Une seule mise en page par entrée ou sortie** (2026-11-16) : la cale change de hauteur d'un coup, au début de
 * l'entrée et à la fin de la sortie ; seule la bande s'anime, en `transform` et en opacité, sur le fil UI.
 */
export function TopBannerProvider<K extends string>({
  kind,
  render,
  children,
}: {
  kind: K | null
  render: (kind: K, safeTop: number) => ReactNode
  children: ReactNode
}) {
  const [shownKind, setShownKind] = useState<K | null>(kind)
  const [owned, setOwned] = useState(kind !== null)
  if (kind !== null && kind !== shownKind) setShownKind(kind)
  if (kind !== null && !owned) setOwned(true)
  const progress = useSharedValue(0)
  const [height, setHeight] = useState(0)

  const finishExit = () => {
    setOwned(false)
    setShownKind(null)
    setHeight(0)
  }

  useEffect(() => {
    const config = { duration: BANNER_MS, easing: BANNER_EASING, reduceMotion: ReduceMotion.System }
    if (kind !== null) {
      // On attend la mesure : la cale et le trajet de la bande en dépendent.
      if (height > 0) progress.value = withTiming(1, config)
      return
    }
    if (shownKind === null) return
    progress.value = withTiming(0, config, (finished) => {
      'worklet'
      if (finished) scheduleOnRN(finishExit)
    })
    // `finishExit` ne lit que des setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, height])

  const value = useMemo<TopBannerState>(
    () => ({
      kind: shownKind,
      owned,
      progress,
      height,
      // Toutes les instances ont la même largeur et le même contenu : la première mesure vaut pour toutes.
      onLayout: (event) => setHeight(event.nativeEvent.layout.height),
      render: render as (kind: string, safeTop: number) => ReactNode,
    }),
    [shownKind, owned, progress, height, render],
  )
  return <TopBannerContext.Provider value={value}>{children}</TopBannerContext.Provider>
}

/**
 * Safe area haute de l'écran : 0 quand la bande la porte, sinon celle de l'appareil. Tout écran qui l'utilise rend
 * `TopBannerFrame`. Hors du layout connecté (auth, onboarding), toujours celle de l'appareil.
 */
export function useScreenTopInset() {
  const banner = useContext(TopBannerContext)
  const insets = useSafeAreaInsets()
  return banner?.owned ? 0 : insets.top
}

/**
 * Cadre d'un écran : la bande en tête, puis le corps (`flex: 1`), qui reçoit les éléments absolus de l'écran (barre
 * compacte, bouton flottant) sous la bande, comme le `ParallaxScreen` du lab.
 */
export function TopBannerFrame({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const banner = useContext(TopBannerContext)
  return (
    <View style={[{ flex: 1 }, style]}>
      {banner?.owned && banner.kind !== null && <Band banner={banner} kind={banner.kind} />}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}

function Band({ banner, kind }: { banner: TopBannerState; kind: string }) {
  const top = useSafeAreaInsets().top
  const { progress, height } = banner
  // Trajet de la bande : sa hauteur utile, sous la safe area.
  const travel = Math.max(0, height - top)
  // Glisse depuis le haut ; fondu pour ne pas teinter la barre d'état au départ.
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [{ translateY: (progress.value - 1) * travel }],
  }))
  // Cale fixe pendant tout le mouvement : la safe area tant que la bande n'est pas mesurée, puis sa hauteur.
  return (
    <View style={{ height: top + travel, zIndex: 40 }}>
      <Animated.View onLayout={banner.onLayout} pointerEvents="box-none" style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, style]}>
        {banner.render(kind, top)}
      </Animated.View>
    </View>
  )
}
