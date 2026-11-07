import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import {
  Platform,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { createTabList } from 'react-native-collapsible-tabs-native'
import { GestureDetector, GestureStateManager, usePanGesture, type PanGesture } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  scrollTo,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated'
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets'
import { haptic } from '../haptics'
import { useReducedMotion } from '../motion'
import { useHorizontalGesture } from './horizontal-gesture'
import { LoadMoreIndicator } from './load-more-indicator'
import { withActivePageScrollsToTop } from './tab-page'

/** Traction (pt, après résistance) au-delà de laquelle le relâcher charge la suite. */
export const LOAD_MORE_THRESHOLD = 72
/** Hauteur du loader : la liste reste aimantée à cette hauteur pendant la requête. */
const LOADER_HEIGHT = 72
/** Une page servie en local s'affiche quand même le temps de voir l'indicateur tourner. */
const MIN_LOADING_MS = 600
/**
 * iOS : le rebond natif est coupé un peu **avant** le bas (et seulement une fois le haut quitté, pour garder le
 * pull-to-refresh) : coupé pile au bas, l'état arrivait après le geste et le ressort natif s'ajoutait au nôtre.
 */
const NEAR_END = 120
/** Part de la hauteur visible dévoilée après l'arrivée de la suite : on voit les nouveaux éléments en entier. */
const REVEAL = 0.5
/** Attente maximale (frames) de la mesure du nouveau contenu avant de refermer sans compenser. */
const SETTLE_FRAMES = 30
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
  /**
   * Défilement natif coupé pendant la traction : seul notre ressort bouge la liste. Valeur partagée, posée par le geste
   * sur le thread UI : sur iOS, le pan d'`UIScrollView` continue en parallèle du nôtre tant que `scrollEnabled` n'est
   * pas retombé — via React, il arrivait quelques frames trop tard.
   */
  locked: SharedValue<boolean>
  /** iOS : rebond natif coupé (bas de liste ou presque). */
  noBounce: boolean
  measure: (event: NativeScrollEvent) => void
  setViewport: (height: number) => void
  setContent: (height: number) => void
  /** Traction courante (pt), pour le pied qui s'efface quand elle commence. */
  pull: SharedValue<number>
  /** Le défilement s'enregistre : à la fin du chargement, la liste défile jusqu'aux nouveaux éléments. */
  register: (ref: AnimatedRef<Animated.ScrollView> | null) => void
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
  /** Remplace `flex: 1` (feuille ajustée à son contenu : hauteur naturelle, plafonnée). */
  style?: StyleProp<ViewStyle>
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
export function DragToLoadMore({ enabled, loading = false, onLoadMore, style, children }: DragToLoadMoreProps) {
  const reduced = useReducedMotion()
  // Un rail horizontal (Top 10, puces…) possède le geste : le pan du pied de liste ne doit jamais l'intercepter.
  const horizontalOwned = useHorizontalGesture()?.owned

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

  const locked = useSharedValue(false)
  const [noBounce, setNoBounce] = useState(false)
  const [busy, setBusy] = useState(false)
  const content = useRef(0)
  const viewportHeight = useRef(0)
  const offset = useRef(0)
  const startedAt = useRef(0)
  const contentAtStart = useRef(0)
  const scroller = useRef<AnimatedRef<Animated.ScrollView> | null>(null)

  const updateEnd = () => {
    const bottom = offset.current + viewportHeight.current
    const end = bottom >= content.current - 2
    atEndValue.value = end
    const near = end || (offset.current > 0 && bottom >= content.current - NEAR_END)
    setNoBounce((current) => (current === near ? current : near))
  }

  const start = () => {
    startedAt.current = Date.now()
    contentAtStart.current = content.current
    setBusy(true)
    onLoadMore()
  }

  /** Dernière position du doigt (absoluteY) et départ en X, pour décider à la main de l'activation. */
  const lastY = useSharedValue(0)
  const startX = useSharedValue(0)
  /** Montée cumulée du doigt depuis son dernier mouvement vers le bas. */
  const climbed = useSharedValue(0)
  const activated = useSharedValue(false)

  const pan = usePanGesture({
    enabled,
    // Activation à la main : seulement liste en bas et doigt qui monte. Au milieu de la liste, ou vers le bas, le geste
    // ne s'active jamais : le défilement natif et le pull-to-refresh du haut (SwipeRefreshLayout, RefreshControl)
    // gardent le toucher. Actif, Gesture Handler prend le toucher et la liste native s'arrête.
    manualActivation: true,
    onTouchesDown: (event) => {
      'worklet'
      const touch = event.allTouches[0]
      if (!touch) return
      lastY.value = touch.absoluteY
      startX.value = touch.absoluteX
      climbed.value = 0
      anchor.value = Number.NaN
      activated.value = false
    },
    onTouchesMove: (event) => {
      'worklet'
      const touch = event.allTouches[0]
      if (!touch || activated.value) return
      if (horizontalOwned?.value) {
        GestureStateManager.fail(event.handlerTag)
        return
      }
      const dy = touch.absoluteY - lastY.value
      lastY.value = touch.absoluteY
      if (dy < 0) climbed.value -= dy
      else if (dy > 0) climbed.value = 0
      if (Math.abs(touch.absoluteX - startX.value) > 24 && pull.value === 0) {
        GestureStateManager.fail(event.handlerTag)
        return
      }
      if (phase.value === 0 && enabledValue.value && atEndValue.value && climbed.value > 4) {
        anchor.value = touch.absoluteY
        activated.value = true
        // Avant l'activation : la liste native s'arrête dans la même frame que notre ressort démarre.
        locked.value = true
        GestureStateManager.activate(event.handlerTag)
        return
      }
    },
    onUpdate: (event) => {
      'worklet'
      if (phase.value === 2 || !enabledValue.value || Number.isNaN(anchor.value)) return
      const over = anchor.value - event.absoluteY
      const next = over > 0 ? rubberBand(over, viewport.value) : 0
      pull.value = next
      if (next > 0 && phase.value === 0) phase.value = 1
      const nowArmed = next >= LOAD_MORE_THRESHOLD
      if (nowArmed !== armed.value) {
        armed.value = nowArmed
        if (nowArmed) scheduleOnRN(haptic, 'light')
      }
    },
    onFinalize: () => {
      'worklet'
      anchor.value = Number.NaN
      activated.value = false
      locked.value = false
      if (phase.value !== 1) return
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

  // Fin de la requête (au moins MIN_LOADING_MS) : la liste se referme **sur les nouveaux éléments** (2026-11-07).
  // Refermer seulement (pull → 0) laissait le défilement en place : la suite arrivait au ras du bas de l'écran, rognée.
  // Dès que le nouveau contenu est mesuré, dans la même frame sur le thread UI, la traction retombe et le défilement
  // avance d'autant — rien ne bouge à l'écran, la zone du loader montre le début de la suite —, puis la liste défile
  // en douceur pour la dévoiler.
  useEffect(() => {
    if (!busy || loading) return
    let cancelled = false
    let frame: number | null = null
    const close = () => {
      pull.value = withSpring(0, SPRING)
      phase.value = 0
      setBusy(false)
    }
    const settle = (frames: number) => {
      if (cancelled) return
      const grown = content.current - contentAtStart.current
      const ref = scroller.current
      if (grown < LOADER_HEIGHT && frames < SETTLE_FRAMES) {
        frame = requestAnimationFrame(() => settle(frames + 1))
        return
      }
      if (grown < LOADER_HEIGHT || !ref) {
        close()
        return
      }
      const from = offset.current + LOADER_HEIGHT
      const max = Math.max(from, content.current - viewportHeight.current)
      const to = Math.min(max, from + viewportHeight.current * REVEAL)
      const animate = !reduced
      scheduleOnUI(() => {
        'worklet'
        pull.value = 0
        scrollTo(ref, 0, from, false)
        if (to > from) scrollTo(ref, 0, to, animate)
      })
      phase.value = 0
      setBusy(false)
    }
    const timer = setTimeout(() => settle(0), Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt.current)))
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [busy, loading, phase, pull, reduced])

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
      noBounce,
      pull,
      register: (ref) => {
        scroller.current = ref
      },
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
    [pan, enabled, locked, noBounce],
  )

  return (
    <LoadMoreContext.Provider value={value}>
      <View style={[{ flex: 1 }, style, { overflow: 'hidden' }]}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[{ flex: 1 }, style, listStyle]}>{children}</Animated.View>
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
 * `ScrollView` (React Native, pour que le pull-to-refresh natif du haut garde la main) à poser sous `DragToLoadMore`
 * (seul ou en `renderScrollComponent` d'une FlashList) : il mesure s'il est en bas, coupe le rebond natif en bas (iOS) et l'étirement (Android), et se
 * fige pendant la traction.
 */
export function LoadMoreScrollView({ onScroll, onLayout, onContentSizeChange, ref, ...props }: ScrollViewProps & { ref?: Ref<ScrollViewInstance | null> }) {
  const context = useContext(LoadMoreContext)
  const fallback = useSharedValue(false)
  const locked = context?.locked ?? fallback
  const userScrollEnabled = props.scrollEnabled !== false
  // Posé depuis le thread UI par le geste : la liste native se fige sans attendre un rendu React.
  const animatedProps = useAnimatedProps(() => ({ scrollEnabled: userScrollEnabled && !locked.value }))
  const animatedRef = useAnimatedRef<Animated.ScrollView>()
  const register = context?.register
  useEffect(() => {
    register?.(animatedRef)
    return () => register?.(null)
  }, [register, animatedRef])
  // Ref stable : une ref en ligne se détache et se rattache à chaque rendu.
  const setRef = useCallback(
    (node: Animated.ScrollView | null) => {
      animatedRef(node)
      if (typeof ref === 'function') ref(node as unknown as ScrollViewInstance)
      else if (ref) (ref as { current: unknown }).current = node
    },
    [animatedRef, ref],
  )
  if (!context) return <ScrollView ref={ref} onScroll={onScroll} onLayout={onLayout} onContentSizeChange={onContentSizeChange} {...props} />
  const { enabled, noBounce, measure, setViewport, setContent } = context
  return (
    <Animated.ScrollView
      scrollEventThrottle={16}
      {...props}
      ref={setRef}
      animatedProps={animatedProps}
      bounces={Platform.OS === 'ios' && enabled && noBounce ? false : props.bounces}
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
