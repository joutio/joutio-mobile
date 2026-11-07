import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated'
import { ArrowClockwiseIcon, CaretDownIcon, CaretUpIcon, CheckCircleIcon, WarningCircleIcon } from '../icons'
import { Button } from '../primitives/button'
import { PressableScale } from '../primitives/pressable-scale'
import { Spinner } from '../primitives/spinner'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { HAIRLINE } from '../theme/hairline'
import { LOAD_MORE_THRESHOLD, useLoadMoreAction, useLoadMorePull } from './drag-to-load-more'

export type FeedFooterState = 'more' | 'loading' | 'error' | 'end'

export interface FeedFooterProps {
  state: FeedFooterState
  /**
   * Pages déjà affichées. La fin (« Tu as tout vu ») n'apparaît qu'après **au moins une page tirée en plus**
   * (`pages > 1`, 2026-11-07) : une liste tenue en une page n'annonce rien.
   */
  pages: number
  onLoadMore?: () => void
  onRetry?: () => void
  /** Message de fin de liste. */
  endLabel?: string
  /** État `more` : ce qui reste, si on le connaît (« 83 autres sujets »). */
  remainingLabel?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Pied d'une liste paginée (`ListFooterComponent`). La suite se charge en tirant la liste vers le haut une fois en bas
 * (`DragToLoadMore`, dont le loader vit sous la liste) : en état `more`, le pied l'annonce (« Tire pour voir la
 * suite », et ce qui reste) puis s'efface dès que la traction commence ; il reste un bouton « Charger la suite »
 * pour le toucher et les lecteurs d'écran. Les éléments déjà chargés restent visibles quand la page suivante
 * échoue.
 */
export function FeedFooter({ state, pages, onLoadMore, onRetry, endLabel = 'Tu as tout vu', remainingLabel, style }: FeedFooterProps) {
  const { colors, radius } = useTheme()
  // Sous `DragToLoadMore`, le chargement se voit dans son loader, sous la liste : le pied garde sa place (l'annonce,
  // effacée par la traction) au lieu de passer à une roue — un seul indicateur, une hauteur qui ne saute pas.
  const pulling = useLoadMorePull() !== null

  if (state === 'end' && pages <= 1) return null

  if (state === 'loading' && pulling) return <PullHint onLoadMore={onLoadMore} remainingLabel={remainingLabel} style={style} />

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

  return <PullHint onLoadMore={onLoadMore} remainingLabel={remainingLabel} style={style} />
}

/** Annonce de la suite : chevron, « Tire pour voir la suite » et ce qui reste ; s'efface sous la traction. */
function PullHint({ onLoadMore, remainingLabel, style }: { onLoadMore?: () => void; remainingLabel?: string; style?: StyleProp<ViewStyle> }) {
  const pull = useLoadMorePull()
  // Hors de `DragToLoadMore` (liste dans une feuille) : rien à tirer, un vrai bouton charge la suite.
  if (!pull) {
    return (
      <View style={[{ alignItems: 'center', gap: tokens.space[2], paddingVertical: tokens.space[3] }, style]}>
        <Button variant="plain" tone="accent" size="S" icon={CaretDownIcon} onPress={onLoadMore} style={{ alignSelf: 'center' }}>
          Charger la suite
        </Button>
        {remainingLabel && (
          <Text variant="caption" color="muted">
            {remainingLabel}
          </Text>
        )}
      </View>
    )
  }
  return <PullHintBody pull={pull} onLoadMore={onLoadMore} remainingLabel={remainingLabel} style={style} />
}

function PullHintBody({
  pull,
  onLoadMore,
  remainingLabel,
  style,
}: {
  pull: NonNullable<ReturnType<typeof useLoadMorePull>>
  onLoadMore?: () => void
  remainingLabel?: string
  style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  // Le pied touché charge par le même chemin que la traction (`DragToLoadMore`) : loader sous la liste, puis dévoilement
  // des nouveaux éléments. Appeler la requête directement les laissait sous le bas de l'écran, rognés (2026-11-07).
  const load = useLoadMoreAction()
  const fade = useAnimatedStyle(() => ({ opacity: interpolate(pull.value, [0, LOAD_MORE_THRESHOLD * 0.35], [1, 0], 'clamp') }))
  return (
    <Animated.View style={[{ alignItems: 'center' }, fade, style]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={remainingLabel ? `Charger la suite, ${remainingLabel}` : 'Charger la suite'}
        accessibilityHint="Ou tire la liste vers le haut"
        pressedScale={0.98}
        onPress={load ?? onLoadMore}
        style={{
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.space[1],
          paddingVertical: tokens.space[3],
          paddingHorizontal: tokens.space[5],
        }}
      >
        <CaretUpIcon size={16} color={colors.muted} />
        <Text variant="callout" weight="600" color="muted">
          Tire pour voir la suite
        </Text>
        {remainingLabel && (
          <Text variant="caption" color="muted">
            {remainingLabel}
          </Text>
        )}
      </PressableScale>
    </Animated.View>
  )
}
