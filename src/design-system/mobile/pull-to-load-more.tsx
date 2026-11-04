import { useRef, useState } from 'react'
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import { haptic } from '../haptics'

/** Traction (pt) au-delà de laquelle le relâcher charge la suite, comme le seuil d'un pull-to-refresh. */
export const PULL_THRESHOLD = 72

/** État du geste, transmis au `FeedFooter` (prop `pull`) qui l'anime. */
export interface PullState {
  /** Traction courante (pt), lue sur le thread UI. */
  distance: SharedValue<number>
  /** Seuil franchi : relâcher chargera la suite. */
  armed: boolean
}

export interface PullToLoadMoreOptions {
  /** Une page suivante existe et aucune n'est en cours. */
  enabled: boolean
  onLoadMore: () => void
}

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>

/** Dépassement du bas du contenu (pt) : positif quand on tire la liste vers le haut au-delà de sa fin. */
const overscroll = ({ contentOffset, contentSize, layoutMeasurement }: NativeScrollEvent) =>
  Math.max(0, contentOffset.y + layoutMeasurement.height - Math.max(contentSize.height, layoutMeasurement.height))

/**
 * **Pull-to-refresh inversé** pour charger la suite d'une liste (`contenu.md` § Listes paginées) : en bas de la liste,
 * on tire vers le haut ; la liste résiste (rebond natif d'iOS) et c'est **« Charger la suite » qui s'anime** avec la
 * traction (`FeedFooter` reçoit `pull`) ; un retour haptique marque le seuil, et **relâcher au-delà du seuil** charge
 * la page suivante. En deçà, rien.
 *
 * `scrollProps` sur la liste, `pull` sur son `FeedFooter`.
 *
 * Android : le `ScrollView` natif ne dépasse pas sa fin (pas de rebond mesurable). En attendant le geste dédié, la
 * suite s'y charge quand on relâche la liste arrivée en bas.
 */
export function usePullToLoadMore({ enabled, onLoadMore }: PullToLoadMoreOptions) {
  const distance = useSharedValue(0)
  const armed = useRef(false)
  const [armedState, setArmed] = useState(false)
  const atEnd = useRef(false)
  const arm = (next: boolean) => {
    if (armed.current === next) return
    armed.current = next
    setArmed(next)
    if (next) haptic('light')
  }

  const onScroll = (event: ScrollEvent) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
    const pulled = overscroll(event.nativeEvent)
    distance.value = pulled
    atEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 1
    // Seuil franchi ou repassé : libellé et retour haptique, comme UIRefreshControl.
    arm(enabled && pulled >= PULL_THRESHOLD)
  }

  const onScrollEndDrag = (event: ScrollEvent) => {
    if (!enabled) return
    const release = Platform.OS === 'ios' ? overscroll(event.nativeEvent) >= PULL_THRESHOLD : atEnd.current
    arm(false)
    if (release) onLoadMore()
  }

  const pull: PullState = { distance, armed: armedState }
  return { scrollProps: { onScroll, onScrollEndDrag, scrollEventThrottle: 16, alwaysBounceVertical: true }, pull }
}
