import { useState } from 'react'
import { Platform, View } from 'react-native'
import Animated, { interpolate, useAnimatedStyle, useEvent, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { haptic } from '../haptics'
import { CircleNotchIcon } from '../icons'
import { Spinner } from '../primitives/spinner'
import { useTheme } from '../theme/theme-provider'

/** Seuil de déclenchement de la lib (`refreshThreshold`, 70 par défaut). */
const THRESHOLD = 70
const DISC = 36
const ICON = 20

/**
 * iOS : la lib insère son spinner natif **sous** l'en-tête et les onglets (montés après lui) ; notre en-tête opaque
 * (image qui déborde vers le haut pour couvrir le tiré) le masque entièrement. On cache donc le natif et on dessine le
 * nôtre par-dessus, depuis la traction que la lib remonte (`onHeaderOffsetChange` → `pull`). Android garde le spinner
 * du `SwipeRefreshLayout`, dessiné au-dessus du contenu.
 */
const CUSTOM_INDICATOR = Platform.OS === 'ios'

/**
 * Refresh de **toute la page** (pull-to-refresh du conteneur natif) : l'en-tête descend avec le tiré, l'indicateur
 * reste affiché jusqu'à la fin de `onRefresh`. Renvoie les props du `CollapsibleTabView` (`tabProps`) et l'indicateur
 * à poser par-dessus (`indicator`, iOS).
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

  if (!onRefresh) return { refreshing: false, tabProps: {}, indicator: () => null }

  return {
    refreshing,
    tabProps: {
      refreshing,
      onRefresh: () => {
        // Le natif ne vibre pas (et Android ne remonte pas la traction) : le retour haptique marque le déclenchement.
        haptic('light')
        setRefreshing(true)
        Promise.resolve(onRefresh())
          .catch(() => undefined)
          .finally(() => setRefreshing(false))
      },
      refreshTintColor: colors.muted,
      refreshBackgroundColor: colors.surface,
      refreshIndicatorHidden: CUSTOM_INDICATOR,
      ...(CUSTOM_INDICATOR ? { onHeaderOffsetChange } : {}),
    },
    /** À poser en `position: absolute` au-dessus de la page, `top` sous la barre de l'écran. */
    indicator: (top: number) => (CUSTOM_INDICATOR ? <PullIndicator pull={pull} refreshing={refreshing} top={top} /> : null),
  }
}

/** Pastille et spinner : apparaît et tourne avec la traction, puis tourne seule pendant le rechargement. */
export function PullIndicator({ pull, refreshing, top }: { pull: SharedValue<number>; refreshing: boolean; top: number }) {
  const { colors, radius } = useTheme()
  const style = useAnimatedStyle(() => {
    const progress = Math.min(1, pull.value / THRESHOLD)
    return {
      opacity: refreshing ? 1 : interpolate(progress, [0.1, 0.6], [0, 1], 'clamp'),
      transform: [{ scale: refreshing ? 1 : interpolate(progress, [0, 1], [0.6, 1], 'clamp') }],
    }
  })
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.min(1, pull.value / THRESHOLD) * 270}deg` }] }))
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', zIndex: 20 }}>
      <Animated.View
        accessible={refreshing}
        accessibilityLabel={refreshing ? 'Rechargement' : undefined}
        style={[
          {
            width: DISC,
            height: DISC,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            boxShadow: colors.shadow,
          },
          style,
        ]}
      >
        {refreshing ? (
          <Spinner size={ICON} color={colors.text} />
        ) : (
          <Animated.View style={turn}>
            <CircleNotchIcon size={ICON} color={colors.text} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  )
}
