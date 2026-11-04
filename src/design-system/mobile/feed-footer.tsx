import { View, type StyleProp, type ViewStyle } from 'react-native'
import { ArrowClockwiseIcon, ArrowDownIcon, CheckCircleIcon, WarningCircleIcon } from '../icons'
import { Button } from '../primitives/button'
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated'
import { PressableScale } from '../primitives/pressable-scale'
import { Spinner } from '../primitives/spinner'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { HAIRLINE } from '../theme/hairline'
import { PULL_THRESHOLD, type PullState } from './pull-to-load-more'

export type FeedFooterState = 'more' | 'loading' | 'error' | 'end'

export interface FeedFooterProps {
  state: FeedFooterState
  onLoadMore?: () => void
  onRetry?: () => void
  /** Message de fin de liste. */
  endLabel?: string
  /** Pull-to-refresh inversé (`usePullToLoadMore`) : « Charger la suite » suit la traction. */
  pull?: PullState
  style?: StyleProp<ViewStyle>
}

/**
 * Pied d'une liste paginée (`ListFooterComponent`). La liste charge la suite **d'elle-même** en arrivant en bas
 * (`onEndReached`, ou un tiré vers le haut une fois en bas) : le pied montre alors un spinner, comme un
 * pull-to-refresh posé en bas. « Charger la suite » reste en repli. Les éléments déjà chargés restent visibles quand
 * la page suivante échoue.
 */
export function FeedFooter({ state, onLoadMore, onRetry, endLabel = 'Tu as tout vu', pull, style }: FeedFooterProps) {
  const { colors, radius } = useTheme()

  if (state === 'loading') {
    return (
      <View
        accessible
        accessibilityLabel="Chargement de la suite"
        accessibilityLiveRegion="polite"
        accessibilityState={{ busy: true }}
        style={[{ alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: tokens.space[4] }, style]}
      >
        <Spinner size={24} color={colors.muted} />
      </View>
    )
  }

  if (state === 'error') {
    return (
      <View
        accessibilityRole="alert"
        style={[
          { alignItems: 'center', gap: tokens.space[3], padding: tokens.space[5], borderRadius: radius.lg, borderWidth: HAIRLINE, borderColor: colors.border },
          style,
        ]}
      >
        <WarningCircleIcon size={20} color={colors.wrong} />
        <Text variant="caption" color="muted" align="center">
          La suite n'a pas pu se charger.
        </Text>
        <Button variant="plain" tone="accent" size="S" icon={ArrowClockwiseIcon} onPress={onRetry}>
          Réessayer
        </Button>
      </View>
    )
  }

  if (state === 'end') {
    return (
      <View
        accessible
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.space[3],
            paddingTop: tokens.space[5],
            paddingBottom: tokens.space[3],
            borderTopWidth: HAIRLINE,
            borderTopColor: colors.border,
          },
          style,
        ]}
      >
        <CheckCircleIcon size={16} color={colors.muted} />
        <Text variant="caption" color="muted">
          {endLabel}
        </Text>
      </View>
    )
  }

  if (pull) return <PullLoadMore pull={pull} onLoadMore={onLoadMore} style={style} />

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <Button variant="plain" tone="neutral" icon={ArrowDownIcon} onPress={onLoadMore}>
        Charger la suite
      </Button>
    </View>
  )
}

/**
 * « Charger la suite » piloté par la traction : il monte avec le doigt (jusqu'à 16 pt), sa flèche pivote jusqu'à se
 * retourner au seuil, et le libellé devient « Relâche pour charger ». Reste un bouton au toucher.
 */
function PullLoadMore({ pull, onLoadMore, style }: { pull: PullState; onLoadMore?: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  const { distance, armed } = pull
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(16, distance.value * 0.22) }],
  }))
  const arrow = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(distance.value, [0, PULL_THRESHOLD], [0, 180], 'clamp')}deg` }],
  }))
  return (
    <Animated.View style={[{ alignItems: 'center' }, lift, style]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Charger la suite"
        accessibilityHint="Ou tire la liste vers le haut puis relâche"
        pressedScale={0.98}
        onPress={onLoadMore}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingHorizontal: tokens.space[5] }}
      >
        <Animated.View style={arrow}>
          <ArrowDownIcon size={18} color={armed ? colors.accentInk : colors.text} />
        </Animated.View>
        <Text variant="callout" weight="600" color={armed ? 'accentInk' : 'text'}>
          {armed ? 'Relâche pour charger' : 'Charger la suite'}
        </Text>
      </PressableScale>
    </Animated.View>
  )
}
