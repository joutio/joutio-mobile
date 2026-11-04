import { View, type StyleProp, type ViewStyle } from 'react-native'
import { ArrowClockwiseIcon, ArrowDownIcon, CheckCircleIcon, WarningCircleIcon } from '../icons'
import { Button } from '../primitives/button'
import { Skeleton } from '../primitives/skeleton'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { HAIRLINE } from '../theme/hairline'

export type FeedFooterState = 'more' | 'loading' | 'error' | 'end'

export interface FeedFooterProps {
  state: FeedFooterState
  onLoadMore?: () => void
  onRetry?: () => void
  /** Message de fin de liste. */
  endLabel?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Pied d'une liste paginée (`ListFooterComponent`). Les éléments déjà chargés restent visibles quand la page
 * suivante échoue.
 */
export function FeedFooter({ state, onLoadMore, onRetry, endLabel = 'Tu as tout vu', style }: FeedFooterProps) {
  const { colors, radius } = useTheme()

  if (state === 'loading') {
    return (
      <View
        accessible
        accessibilityLabel="Chargement de la suite"
        accessibilityLiveRegion="polite"
        accessibilityState={{ busy: true }}
        style={[{ gap: tokens.space[3] }, style]}
      >
        <Skeleton shape="row" />
        <Skeleton shape="row" />
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

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <Button variant="plain" tone="neutral" icon={ArrowDownIcon} onPress={onLoadMore}>
        Charger la suite
      </Button>
    </View>
  )
}
