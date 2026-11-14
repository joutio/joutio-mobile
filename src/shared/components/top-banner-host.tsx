import { useEffect, useState, type ReactNode } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { BANNER_EASING, BANNER_MS } from './banner-motion'

export type TopBannerKind = 'connection' | 'game'

/**
 * Bande du haut et écran dessous (`feedback.md`, refonte du 2026-11-14). La bande est posée **par-dessus** l'écran,
 * hors de sa mise en page ; une cale animée sous elle fait descendre l'écran du même mouvement. Rien d'autre ne bouge :
 *
 * - la bande prend la safe area haute (l'écran ne la réserve plus) au **même rendu** qu'une cale fixe de sa hauteur :
 *   l'échange est invisible, le contenu ne remonte jamais ;
 * - puis la cale grandit de la hauteur utile de la bande (`progress` 0 → 1) pendant que la bande glisse du haut ;
 * - à la sortie, l'inverse, puis la safe area revient à l'écran au même rendu que la cale fixe disparaît.
 *
 * Plus d'animation de mise en page (Reanimated `layout`) : elle partait de la position déjà décalée et faisait remonter
 * l'écran avant de le redescendre.
 */
export function TopBannerHost({ kind, render, children }: { kind: TopBannerKind | null; render: (kind: TopBannerKind) => ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets()
  // Dernière bande affichée : rendue pendant sa sortie. `owned` : la bande porte la safe area haute.
  const [shownKind, setShownKind] = useState<TopBannerKind | null>(kind)
  const [owned, setOwned] = useState(kind !== null)
  if (kind !== null && kind !== shownKind) setShownKind(kind)
  if (kind !== null && !owned) setOwned(true)

  const progress = useSharedValue(0)
  const height = useSharedValue(0)
  const [measured, setMeasured] = useState(false)
  const top = insets.top

  const finishExit = () => {
    setOwned(false)
    setShownKind(null)
    setMeasured(false)
  }

  useEffect(() => {
    const config = { duration: BANNER_MS, easing: BANNER_EASING, reduceMotion: ReduceMotion.System }
    if (kind !== null) {
      // On attend la mesure de la bande : sans sa hauteur, la cale ne saurait pas jusqu'où descendre.
      if (measured) progress.value = withTiming(1, config)
      return
    }
    if (shownKind === null) return
    progress.value = withTiming(0, config, (finished) => {
      'worklet'
      if (finished) scheduleOnRN(finishExit)
    })
    // `finishExit` ne lit que des setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, measured])

  const onLayout = (event: LayoutChangeEvent) => {
    height.value = event.nativeEvent.layout.height
    if (!measured) setMeasured(true)
  }

  // Cale : la hauteur utile de la bande (sans la safe area, déjà tenue par la cale fixe).
  const spacer = useAnimatedStyle(() => ({ height: Math.max(0, height.value - top) * progress.value }))
  // Bande : son bas reste collé au haut de l'écran ; fondu pour ne pas teinter la barre d'état au départ.
  const band = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [{ translateY: (progress.value - 1) * Math.max(0, height.value - top) }],
  }))

  return (
    <View style={{ flex: 1 }}>
      {/* Cale fixe : remplace la safe area que l'écran ne réserve plus, au même rendu. */}
      {owned && <View style={{ height: top }} />}
      <Animated.View style={spacer} />
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
