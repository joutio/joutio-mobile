import { useEffect, useState, type ReactNode } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { BANNER_EASING, BANNER_MS } from './banner-motion'

export type TopBannerKind = 'connection' | 'game'

/**
 * Bande du haut et écran dessous (`feedback.md`). La bande est posée **par-dessus** l'écran, hors de sa mise en page ;
 * une cale sous elle fait descendre l'écran de sa hauteur.
 *
 * **Une seule mise en page par entrée ou sortie** (2026-11-16, remplace la cale animée image par image) : la cale change
 * de hauteur d'un coup, au début de l'entrée et à la fin de la sortie ; seule la bande s'anime, en `transform` et en
 * opacité, sur le fil UI. Une cale animée redimensionnait le navigateur d'onglets à chaque image : react-navigation
 * (`BottomTabView`) re-rendait tout l'arbre des onglets et iOS redimensionnait son `UITabBarController`, d'où la
 * saccade de la barre du bas.
 *
 * - Entrée : la bande prend la safe area haute et la cale sa hauteur utile, au même rendu ; l'écran se décale une fois,
 *   la bande glisse du haut dans l'espace libéré.
 * - Sortie : la bande remonte en s'effaçant, puis cale et safe area reviennent à l'écran au même rendu.
 */
export function TopBannerHost({ kind, render, children }: { kind: TopBannerKind | null; render: (kind: TopBannerKind) => ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets()
  // Dernière bande affichée : rendue pendant sa sortie. `owned` : la bande porte la safe area haute et la cale.
  const [shownKind, setShownKind] = useState<TopBannerKind | null>(kind)
  const [owned, setOwned] = useState(kind !== null)
  if (kind !== null && kind !== shownKind) setShownKind(kind)
  if (kind !== null && !owned) setOwned(true)

  const progress = useSharedValue(0)
  // Hauteur mesurée de la bande (safe area comprise) : la cale en prend la part utile, une fois connue.
  const [bandHeight, setBandHeight] = useState(0)
  const travel = useSharedValue(0)
  const top = insets.top

  const finishExit = () => {
    setOwned(false)
    setShownKind(null)
    setBandHeight(0)
  }

  useEffect(() => {
    const config = { duration: BANNER_MS, easing: BANNER_EASING, reduceMotion: ReduceMotion.System }
    if (kind !== null) {
      // On attend la mesure : la cale et le trajet de la bande en dépendent.
      if (bandHeight > 0) progress.value = withTiming(1, config)
      return
    }
    if (shownKind === null) return
    progress.value = withTiming(0, config, (finished) => {
      'worklet'
      if (finished) scheduleOnRN(finishExit)
    })
    // `finishExit` ne lit que des setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, bandHeight])

  const onLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height
    travel.value = Math.max(0, height - top)
    if (height !== bandHeight) setBandHeight(height)
  }

  // Bande : glisse depuis le haut de sa hauteur utile ; fondu pour ne pas teinter la barre d'état au départ.
  const band = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [{ translateY: (progress.value - 1) * travel.value }],
  }))

  // Cale : fixe pendant tout le mouvement (aucune mise en page image par image).
  const spacer = owned ? top + Math.max(0, bandHeight - top) : 0

  return (
    <View style={{ flex: 1 }}>
      {owned && <View style={{ height: spacer }} />}
      <View style={{ flex: 1 }}>
        <SafeAreaInsetsContext.Provider value={owned ? { ...insets, top: 0 } : insets}>{children}</SafeAreaInsetsContext.Provider>
      </View>
      {shownKind !== null && (
        <Animated.View onLayout={onLayout} pointerEvents="box-none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }, band]}>
          {render(shownKind)}
        </Animated.View>
      )}
    </View>
  )
}
