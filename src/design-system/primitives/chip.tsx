import { useEffect, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import type { Icon } from '../icons'
import { useReducedMotion } from '../motion'
import { hairlineRing } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { PressableScale, slopFor, type PressableScaleProps } from './pressable-scale'
import { Text } from './text'

export interface ChipProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  selected?: boolean
  /** `suggestion` : réponse rapide, filet sans fond. */
  variant?: 'filter' | 'suggestion'
  icon?: Icon
  count?: number
  style?: StyleProp<ViewStyle>
  children: string
}

/** Passage d'un état à l'autre : fondu court, sans rien déplacer. */
const SWAP = { duration: 160, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never }

/**
 * Deux versions superposées du même contenu, en fondu enchaîné : la version sélectionnée (graisse 600, la plus large)
 * reste dans le flux et réserve la largeur, l'autre se pose par-dessus. La puce ne change jamais de taille.
 */
function Crossfade({ progress, off, on }: { progress: SharedValue<number>; off: ReactNode; on: ReactNode }) {
  const onStyle = useAnimatedStyle(() => ({ opacity: progress.value }))
  const offStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }))
  return (
    <View>
      <Animated.View style={onStyle}>{on}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, offStyle]}>{off}</Animated.View>
    </View>
  )
}

/**
 * Filtre ou choix compact (`primitives.md` § Chip). Sélectionnée : fond `text`, texte `bg`, graisse 600. Le changement
 * d'état se fait en fondu (160 ms) sans changer la largeur ; appui en légère échelle. Instantané sous mouvement réduit.
 */
export function Chip({ selected = false, variant = 'filter', icon: IconComponent, count, disabled, style, children, ...props }: ChipProps) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const progress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    progress.value = reduced ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, SWAP)
  }, [selected, reduced, progress])

  const fill = useAnimatedStyle(() => ({ opacity: progress.value }))
  const offWeight = variant === 'suggestion' ? '600' : undefined

  const content = (color: string, weight: '600' | undefined) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }}>
      {IconComponent && <IconComponent size={16} color={color} />}
      <Text variant="callout" color={color} weight={weight} numberOfLines={1}>
        {children}
      </Text>
      {count !== undefined && (
        <Text variant="callout" mono color={color} style={{ opacity: 0.7 }}>
          {count}
        </Text>
      )}
    </View>
  )

  return (
    <PressableScale
      {...props}
      accessibilityRole="togglebutton"
      accessibilityLabel={count === undefined ? children : `${children}, ${count}`}
      accessibilityState={{ checked: selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      pressedScale={0.96}
      haptic="selection"
      hitSlop={slopFor(32)}
      style={[
        {
          minHeight: 32,
          justifyContent: 'center',
          alignSelf: 'flex-start',
          paddingHorizontal: tokens.space[4],
          borderRadius: radius.full,
          overflow: 'hidden',
          backgroundColor: variant === 'suggestion' ? 'transparent' : colors.raised,
          boxShadow: variant === 'suggestion' ? hairlineRing(colors.border) : undefined,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {/* Fond sélectionné, en fondu par-dessus le fond de repos. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.text }, fill]} />
      <Crossfade progress={progress} on={content(colors.bg, '600')} off={content(colors.text, offWeight)} />
    </PressableScale>
  )
}
