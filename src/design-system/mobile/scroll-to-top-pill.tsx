import { useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { haptic } from '../haptics'
import { CaretUpIcon } from '../icons'
import { useReducedMotion } from '../motion'
import { PressableScale } from '../primitives/pressable-scale'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

/** Remontée (pt) qui fait apparaître la pastille : un geste franc, pas un tremblement. */
const UP_DISTANCE = 32
const SHOW = { damping: 22, stiffness: 320 }

export interface ScrollToTopPillProps {
  /** Défilement de la liste (pt), sur le thread UI. */
  scroll: SharedValue<number>
  onPress: () => void
  /** Distance au haut de la zone de contenu, sous ce qui y est collé. */
  top?: number
  /** Défilement à partir duquel elle peut apparaître ; deux écrans par défaut. */
  showAfter?: number
}

/**
 * Pastille « Haut de page » (motif Play Store / Twitter) : au-delà de deux écrans, elle descend dès qu'on remonte un
 * peu, repart quand on redescend ou qu'on approche du haut. Un toucher remonte en haut, avec un retour haptique.
 * Complète le toucher de l'onglet actif (`useScrollToTop`) et, sur iOS, celui de la barre d'état (`scrollsToTop`).
 */
export function ScrollToTopPill({ scroll, onPress, top = tokens.space[3], showAfter }: ScrollToTopPillProps) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const { height } = useWindowDimensions()
  const limit = showAfter ?? height * 2
  const visible = useSharedValue(0)
  const climbed = useSharedValue(0)
  const on = useSharedValue(false)
  const [shown, setShown] = useState(false)

  useAnimatedReaction(
    () => scroll.value,
    (y, previous) => {
      if (previous === null) return
      const delta = y - previous
      let next = on.value
      if (y < limit / 2) {
        climbed.value = 0
        next = false
      } else if (delta < 0) {
        climbed.value -= delta
        if (y > limit && climbed.value > UP_DISTANCE) next = true
      } else if (delta > 0) {
        climbed.value = 0
        next = false
      }
      if (on.value !== next) {
        on.value = next
        visible.value = next ? withSpring(1, SHOW) : withTiming(0, { duration: 160 })
        scheduleOnRN(setShown, next)
      }
    },
    [limit],
  )

  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateY: reduced ? 0 : (1 - visible.value) * -16 }, { scale: reduced ? 1 : 0.9 + visible.value * 0.1 }],
  }))

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', zIndex: 30 }}>
      <Animated.View
        pointerEvents={shown ? 'auto' : 'none'}
        accessibilityElementsHidden={!shown}
        importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
        style={style}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Revenir en haut"
          onPress={() => {
            haptic('selection')
            onPress()
          }}
          style={{
            minHeight: 36,
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[2],
            paddingHorizontal: tokens.space[4],
            borderRadius: radius.full,
            backgroundColor: colors.surface,
            boxShadow: colors.shadow,
          }}
        >
          <CaretUpIcon size={14} color={colors.text} weight="bold" />
          <Text variant="callout" weight="600">
            Haut de page
          </Text>
        </PressableScale>
      </Animated.View>
    </View>
  )
}
