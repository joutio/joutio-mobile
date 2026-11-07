import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import Animated, { interpolate, useAnimatedStyle, useEvent, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { haptic } from '../haptics'
import { useTheme } from '../theme/theme-provider'

/** Seuil de déclenchement de la lib (`refreshThreshold`, 70 par défaut). */
const THRESHOLD = 70
const DISC = 36

// Le même indicateur natif que BottomLoad est affiché sur toutes les pages.
/**
 * Refresh de **toute la page** (pull-to-refresh du conteneur natif) : l'en-tête descend avec le tiré, l'indicateur
 * reste affiché jusqu'à la fin de `onRefresh`. Renvoie les props du `CollapsibleTabView` (`tabProps`) et l'indicateur
 * à poser par-dessus (`indicator`).
 */
export function usePageRefresh(onRefresh?: () => Promise<unknown> | void) {
  const { colors } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const pull = useSharedValue(0)
  const onHeaderOffsetChange = useEvent<{ pull: number }>(
    (event) => {
      'worklet'
      pull.value = event.pull
    },
    ['topHeaderOffsetChange', 'onHeaderOffsetChange'],
  )

  if (!onRefresh) return { refreshing: false, pull, tabProps: { onHeaderOffsetChange }, indicator: () => null }

  return {
    refreshing,
    pull,
    tabProps: {
      refreshing,
      onRefresh: () => {
        // Le natif ne vibre pas (et Android ne remonte pas la traction) : le retour haptique marque le déclenchement.
        haptic('light')
        setRefreshing(true)
        Promise.resolve()
          .then(onRefresh)
          .catch(() => undefined)
          .finally(() => setRefreshing(false))
      },
      refreshTintColor: colors.muted,
      refreshBackgroundColor: colors.surface,
      refreshIndicatorHidden: true,
      onHeaderOffsetChange,
    },
    /** À poser en `position: absolute` au-dessus de la page, `top` sous la barre de l'écran. */
    indicator: (top: number) => <PullIndicator pull={pull} refreshing={refreshing} top={top} />,
  }
}

/** Même UIActivityIndicatorView que BottomLoad sur iOS : sans pastille de fond ni roue SVG. */
export function PullIndicator({ pull, refreshing, top }: { pull: SharedValue<number>; refreshing: boolean; top: number }) {
  const { colors } = useTheme()
  const style = useAnimatedStyle(() => {
    const progress = Math.min(1, pull.value / THRESHOLD)
    return {
      opacity: refreshing ? 1 : interpolate(progress, [0.1, 0.6], [0, 1], 'clamp'),
    }
  })
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', zIndex: 20 }}>
      <Animated.View
        accessible={refreshing}
        accessibilityLabel={refreshing ? 'Rechargement' : undefined}
        style={[
          {
            width: DISC,
            height: DISC,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <ActivityIndicator size="small" color={colors.muted} animating={refreshing} hidesWhenStopped={false} />
      </Animated.View>
    </View>
  )
}
