import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import {
  Platform,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native'
import { createTabList } from 'react-native-collapsible-tabs-native'
import { GestureDetector, ScrollView as GestureScrollView, usePanGesture, type PanGesture } from 'react-native-gesture-handler'
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { haptic } from '../haptics'
import { useReducedMotion } from '../motion'
import { LoadMoreIndicator } from './load-more-indicator'
import { withActivePageScrollsToTop } from './tab-page'

/** Traction (pt, après résistance) au-delà de laquelle le relâcher charge la suite. */
export const LOAD_MORE_THRESHOLD = 72
/** Hauteur du loader : la liste reste aimantée à cette hauteur pendant la requête. */
const LOADER_HEIGHT = 72
/** Une page servie en local s'affiche quand même le temps de voir l'indicateur tourner. */
const MIN_LOADING_MS = 600
/** Ressort du retour et de la fermeture : sans rebond visible, comme un pull-to-refresh. */
const SPRING = { damping: 26, stiffness: 260, mass: 1 }

/**
 * Résistance d'un ressort (formule d'UIScrollView) : quasi libre au départ, de plus en plus dure, plafonnée par la
 * hauteur de la liste.
 */
function rubberBand(distance: number, dimension: number) {
  'worklet'
  const c = 0.55
  return (1 - 1 / ((distance * c) / dimension + 1)) * dimension
}

interface LoadMoreContextValue {
  pan: PanGesture
  enabled: boolean
  /** Défilement natif coupé pendant la traction : seul notre ressort bouge la liste. */
  locked: boolean
  atEnd: boolean
  measure: (event: NativeScrollEvent) => void
  setViewport: (height: number) => void
  setContent: (height: number) => void
  /** Traction courante (pt), pour le pied qui s'efface quand elle commence. */
  pull: SharedValue<number>
}

const LoadMoreContext = createContext<LoadMoreContextValue | null>(null)

/** Traction du `DragToLoadMore` parent, `null` hors de lui. */
export function useLoadMorePull() {
  return useContext(LoadMoreContext)?.pull ?? null
}

export interface DragToLoadMoreProps {
  /** Une page suivante existe (et la précédente n'a pas échoué). */
  enabled: boolean
  /** Requête de la page suivante en cours : la liste reste ouverte sur le loader jusqu'à la fin. */
  loading?: boolean
  onLoadMore: () => void
  /** La liste, dont le défilement est `LoadMoreScrollView` (`renderScrollComponent` d'une FlashList) ou `TabLoadMoreScrollView`. */
  children: ReactNode
}

/**
 * **Drag to load more** : le pull-to-refresh, inversé en bas de liste, identique sur iOS et Android. Arrivé en bas, on
 * continue de tirer : la liste résiste de plus en plus (ressort), le loader natif de l'OS se dessine sous le doigt
 * (`LoadMoreIndicator`) et un retour haptique marque le seuil. Relâché avant, la liste revient en place ; relâché
 * après, elle reste aimantée à la hauteur du loader, qui tourne le temps de la requête, puis se referme sur les
 * nouveaux éléments. Le pied (`FeedFooter`, état `more`) annonce la suite avant le geste. Le rebond natif est coupé en bas (iOS) et l'étirement Android désactivé : seule cette physique joue.
 *
 * Geste (Gesture Handler) et physique (Reanimated) tournent sur le thread UI.
 */
export function DragToLoadMore({ enabled, loading = false, onLoadMore, children }: DragToLoadMoreProps) {
  const reduced = useReducedMotion()

  const pull = useSharedValue(0)
  const viewport = useSharedValue(600)
  const atEndValue = useSharedValue(false)
  /** Position du doigt (translationY) au moment où la liste a touché le bas ; NaN tant qu'elle n'y est pas. */
  const anchor = useSharedValue(Number.NaN)
  const armed = useSharedValue(false)
  /** 0 libre, 1 traction en cours, 2 chargement. */
  const phase = useSharedValue(0)
  const enabledValue = useSharedValue(enabled)
  useEffect(() => {
    enabledValue.value = enabled
  }, [enabled, enabledValue])

  const [locked, setLocked] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [busy, setBusy] = useState(false)
  const content = useRef(0)
  const viewportHeight = useRef(0)
  const offset = useRef(0)
  const startedAt = useRef(0)

  const updateEnd = () => {
    const end = offset.current + viewportHeight.current >= content.current - 2
    atEndValue.value = end
    setAtEnd((current) => (current === end ? current : end))
  }

  const start = () => {
    startedAt.current = Date.now()
    setBusy(true)
    onLoadMore()
  }

  const pan = usePanGesture({
    enabled,
    activeOffsetY: [-4, 4],
    failOffsetX: [-24, 24],
    onUpdate: (event) => {
      'worklet'
      if (phase.value === 2 || !enabledValue.value) return
      if (!atEndValue.value && pull.value === 0) {
        anchor.value = Number.NaN
        return
      }
      if (Number.isNaN(anchor.value)) anchor.value = event.translationY
      const over = anchor.value - event.translationY
      const next = over > 0 ? rubberBand(over, viewport.value) : 0
      pull.value = next
      if (next > 0 && phase.value === 0) {
        phase.value = 1
        scheduleOnRN(setLocked, true)
      }
      const nowArmed = next >= LOAD_MORE_THRESHOLD
      if (nowArmed !== armed.value) {
        armed.value = nowArmed
        if (nowArmed) scheduleOnRN(haptic, 'light')
      }
    },
    onFinalize: () => {
      'worklet'
      anchor.value = Number.NaN
      if (phase.value !== 1) return
      scheduleOnRN(setLocked, false)
      armed.value = false
      if (pull.value >= LOAD_MORE_THRESHOLD && enabledValue.value) {
        phase.value = 2
        pull.value = withSpring(LOADER_HEIGHT, SPRING)
        scheduleOnRN(start)
      } else {
        phase.value = 0
        pull.value = withSpring(0, SPRING)
      }
    },
  })

  // Fin de la requête (au moins MIN_LOADING_MS) : la liste se referme sur les nouveaux éléments.
  useEffect(() => {
    if (!busy || loading) return
    const timer = setTimeout(
      () => {
        pull.value = withSpring(0, SPRING)
        phase.value = 0
        setBusy(false)
      },
      Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt.current)),
    )
    return () => clearTimeout(timer)
  }, [busy, loading, phase, pull])

  const listStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -pull.value }] }))
  const loaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pull.value, [0, LOAD_MORE_THRESHOLD * 0.4], [0, 1], 'clamp'),
    // Centré dans l'espace libéré sous la liste.
    transform: [
      { translateY: (LOADER_HEIGHT - pull.value) / 2 },
      { scale: reduced ? 1 : interpolate(pull.value, [0, LOAD_MORE_THRESHOLD], [0.7, 1], 'clamp') },
    ],
  }))
  const value = useMemo<LoadMoreContextValue>(
    () => ({
      pan,
      enabled,
      locked,
      atEnd,
      pull,
      measure: (event) => {
        offset.current = event.contentOffset.y
        content.current = event.contentSize.height
        viewportHeight.current = event.layoutMeasurement.height
        updateEnd()
      },
      setViewport: (height) => {
        viewportHeight.current = height
        viewport.value = height
        updateEnd()
      },
      setContent: (height) => {
        content.current = height
        updateEnd()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pan, enabled, locked, atEnd],
  )

  return (
    <LoadMoreContext.Provider value={value}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flex: 1 }, listStyle]}>{children}</Animated.View>
        </GestureDetector>
        <Animated.View
          pointerEvents="none"
          accessible={busy}
          accessibilityLabel="Chargement de la suite"
          accessibilityLiveRegion="polite"
          accessibilityState={{ busy }}
          style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: LOADER_HEIGHT, alignItems: 'center', justifyContent: 'center' }, loaderStyle]}
        >
          <LoadMoreIndicator pull={pull} threshold={LOAD_MORE_THRESHOLD} loading={busy} />
        </Animated.View>
      </View>
    </LoadMoreContext.Provider>
  )
}

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>

/**
 * `ScrollView` à poser sous `DragToLoadMore` (seul ou en `renderScrollComponent` d'une FlashList) : il partage son
 * geste avec la traction, mesure s'il est en bas, coupe le rebond natif en bas (iOS) et l'étirement (Android), et se
 * fige pendant la traction.
 */
export function LoadMoreScrollView({ onScroll, onLayout, onContentSizeChange, ref, ...props }: ScrollViewProps & { ref?: Ref<ScrollViewInstance | null> }) {
  const context = useContext(LoadMoreContext)
  if (!context) return <GestureScrollView ref={ref} onScroll={onScroll} onLayout={onLayout} onContentSizeChange={onContentSizeChange} {...props} />
  const { pan, enabled, locked, atEnd, measure, setViewport, setContent } = context
  return (
    <GestureScrollView
      scrollEventThrottle={16}
      {...props}
      ref={ref}
      simultaneousWith={pan}
      scrollEnabled={!locked && props.scrollEnabled !== false}
      bounces={Platform.OS === 'ios' && enabled && atEnd ? false : props.bounces}
      alwaysBounceVertical={props.alwaysBounceVertical ?? true}
      overScrollMode={enabled ? 'never' : props.overScrollMode}
      onScroll={(event: ScrollEvent) => {
        measure(event.nativeEvent)
        onScroll?.(event)
      }}
      onLayout={(event: LayoutChangeEvent) => {
        setViewport(event.nativeEvent.layout.height)
        onLayout?.(event)
      }}
      onContentSizeChange={(width: number, height: number) => {
        setContent(height)
        onContentSizeChange?.(width, height)
      }}
    />
  )
}

/** `LoadMoreScrollView` en page d'onglets (`TabsScrollView`, `CollapsibleTabsScreen`) : décalé sous l'en-tête. */
export const TabLoadMoreScrollView = withActivePageScrollsToTop(createTabList(LoadMoreScrollView))
