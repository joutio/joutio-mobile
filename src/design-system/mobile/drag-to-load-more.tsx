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
/** Attente maximale (frames) de la stabilisation de la hauteur du contenu avant de compenser. */
const SETTLE_FRAMES = 30
/**
 * Requête qui n'aboutit pas (hors connexion : React Query met la requête en pause, `isFetchingNextPage` reste vrai) :
 * au-delà de ce délai, la liste se referme au lieu de rester tirée avec son loader qui tourne (2026-11-07).
 */
const LOAD_TIMEOUT_MS = 12_000
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
  /** Charge la suite sans geste (pied de liste touché) : même loader et même dévoilement que la traction. */
  load: () => void
  /**
   * Feuille : pas d'enveloppe autour du défilement (il reste l'enfant direct de la feuille et garde sa hauteur) ; la
   * traction se pose alors sur le défilement lui-même, et le loader en surimpression.
   */
  overlay: boolean
}

const LoadMoreContext = createContext<LoadMoreContextValue | null>(null)

/** Traction du `DragToLoadMore` parent, `null` hors de lui. */
export function useLoadMorePull() {
  return useContext(LoadMoreContext)?.pull ?? null
}

/**
 * Charge la suite du `DragToLoadMore` parent (pied de liste : le bouton doit passer par la traction, sinon les nouveaux
 * éléments arrivent sous le bas de la liste, rognés et sans dévoilement). `null` hors de lui.
 */
export function useLoadMoreAction() {
  return useContext(LoadMoreContext)?.load ?? null
}

export interface DragToLoadMoreProps {
  /** Une page suivante existe (et la précédente n'a pas échoué). */
  enabled: boolean
  /** Requête de la page suivante en cours : la liste reste ouverte sur le loader jusqu'à la fin. */
  loading?: boolean
  onLoadMore: () => void
  /** Remplace `flex: 1` (feuille ajustée à son contenu : hauteur naturelle, plafonnée). */
  style?: StyleProp<ViewStyle>
  /**
   * Feuille : le défilement reste l'enfant direct du contenu (une enveloppe le laissait sans hauteur, la liste
   * disparaissait). Le loader se pose en surimpression, le geste sur le défilement.
   */
  overlay?: boolean
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
export function DragToLoadMore({ enabled, loading = false, onLoadMore, style, overlay = false, children }: DragToLoadMoreProps) {
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
  /** Mêmes valeurs hors du thread UI (pied touché) : un ref plutôt qu'une lecture de `SharedValue` en JS. */
  const enabledRef = useRef(enabled)
  useEffect(() => {
    enabledValue.value = enabled
    enabledRef.current = enabled
  }, [enabled, enabledValue])

  const locked = useSharedValue(false)
  const [noBounce, setNoBounce] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  useEffect(() => {
    busyRef.current = busy
  }, [busy])
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])
  const content = useRef(0)
  const viewportHeight = useRef(0)
  const offset = useRef(0)
  const startedAt = useRef(0)
  const contentAtStart = useRef(0)
  const offsetAtStart = useRef(0)
  const scroller = useRef<AnimatedRef<Animated.ScrollView> | null>(null)

  const updateEnd = () => {
    const bottom = offset.current + viewportHeight.current
    const end = bottom >= content.current - 2
    atEndValue.value = end
    const near = end || (offset.current > 0 && bottom >= content.current - NEAR_END)
    setNoBounce((current) => (current === near ? current : near))
  }

  /** Début commun aux deux chemins (traction, pied touché) : le loader reste ouvert tant que la requête tourne. */
  const begin = useCallback(() => {
    startedAt.current = Date.now()
    contentAtStart.current = content.current
    offsetAtStart.current = offset.current
    busyRef.current = true
    setBusy(true)
    onLoadMoreRef.current()
  }, [])

  const start = begin

  /** Pied de liste touché : sans geste, c'est ici que la phase de chargement et la traction sont posées. */
  const requestLoad = useCallback(() => {
    if (busyRef.current || !enabledRef.current) return
    phase.value = 2
    locked.value = false
    pull.value = withSpring(LOADER_HEIGHT, SPRING)
    begin()
  }, [begin, locked, phase, pull])

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
  // Dès que la hauteur du contenu est stabilisée, dans la même frame sur le thread UI, la traction retombe et le
  // défilement avance d'autant — rien ne bouge à l'écran, la zone du loader montre le début de la suite —, puis la
  // liste défile pour la dévoiler.
  useEffect(() => {
    if (!busy) return
    let cancelled = false
    let frame: number | null = null
    const close = () => {
      if (cancelled) return
      pull.value = withSpring(0, SPRING)
      phase.value = 0
      setBusy(false)
    }
    // Requête qui n'aboutit pas (hors connexion : elle est en pause, `isFetchingNextPage` reste vrai) : la liste se
    // referme au lieu de rester tirée avec un loader qui tourne indéfiniment (2026-11-07).
    if (loading) {
      const guard = setTimeout(close, LOAD_TIMEOUT_MS)
      return () => {
        cancelled = true
        clearTimeout(guard)
      }
    }
    const settle = (frames: number, previous: number | null) => {
      if (cancelled) return
      const grown = content.current - contentAtStart.current
      const ref = scroller.current
      // Une liste virtualisée rend la suite en plusieurs fois : on attend que la hauteur se stabilise (deux mesures
      // égales) plutôt qu'une croissance donnée — sinon une page courte (dernier élément, pied plus court) n'était
      // jamais compensée, et les nouveaux éléments restaient rognés en bas.
      // Deux mesures à 2 pt près (une image qui se charge déplace la hauteur d'un pixel).
      const stable = previous !== null && Math.abs(grown - previous) <= 2
      if (ref && frames < SETTLE_FRAMES && !stable) {
        frame = requestAnimationFrame(() => settle(frames + 1, grown))
        return
      }
      if (!ref || content.current <= 0 || viewportHeight.current <= 0) {
        close()
        return
      }
      // Le joueur a remonté la liste pendant la requête : on ne la déplace pas sous ses yeux.
      if (offset.current < offsetAtStart.current - 8) {
        close()
        return
      }
      const end = Math.max(0, content.current - viewportHeight.current)
      // Rien ne bouge à l'écran : la traction retombe de la hauteur du loader et le défilement avance d'autant.
      const from = Math.min(offset.current + LOADER_HEIGHT, end)
      // Puis on dévoile : une demi-page quand la suite est longue, le bas de la liste quand elle est courte — dans les
      // deux cas les nouveaux éléments sont visibles en entier, jamais coupés par le bas de l'écran.
      const to = Math.min(end, from + viewportHeight.current * REVEAL)
      const animate = !reduced
      scheduleOnUI(() => {
        'worklet'
        // Le loader s'éteint **une frame avant** que la liste se pose : appliqués dans la même frame, l'opacité et le
        // défilement natif n'arrivent pas ensemble et les nouveaux éléments apparaissaient avec le loader encore là
        // (2026-11-07). Une frame plus tard, le défilement est déjà en place quand l'écran se redessine.
        // Le loader s'éteint **une frame avant** que la liste se pose : écrits dans la même frame, l'opacité et le
        // défilement natif n'arrivent pas ensemble, et les nouveaux éléments apparaissaient avec le loader encore là
        // (2026-11-07). Le défilement part au rafraîchissement suivant, quand l'opacité est déjà appliquée.
        pull.value = 0
        const reveal = () => {
          'worklet'
          scrollTo(ref, 0, from, false)
          if (to > from) scrollTo(ref, 0, to, animate)
        }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reveal)
        else reveal()
      })
      phase.value = 0
      setBusy(false)
    }
    const timer = setTimeout(() => settle(0, null), Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt.current)))
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
      load: requestLoad,
      overlay,
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
    [pan, enabled, locked, noBounce, requestLoad, overlay],
  )

  if (overlay) {
    return (
      <LoadMoreContext.Provider value={value}>
        <>
          <GestureDetector gesture={pan}>{children}</GestureDetector>
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
        </>
      </LoadMoreContext.Provider>
    )
  }

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
  const fallbackPull = useSharedValue(0)
  const pull = context?.pull ?? fallbackPull
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
  // Feuille (`overlay`) : la traction est portée par le défilement, faute d'enveloppe autour de lui. Créée avant le
  // retour anticipé pour que l'ordre des hooks ne change jamais.
  const overlay = context?.overlay ?? false
  const listStyle = useAnimatedStyle(() => ({ transform: [{ translateY: overlay ? -pull.value : 0 }] }))
  if (!context) return <ScrollView ref={ref} onScroll={onScroll} onLayout={onLayout} onContentSizeChange={onContentSizeChange} {...props} />
  const { enabled, noBounce, measure, setViewport, setContent } = context
  return (
    <Animated.ScrollView
      scrollEventThrottle={16}
      {...props}
      style={overlay ? [props.style, listStyle] : props.style}
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
