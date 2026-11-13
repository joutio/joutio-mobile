import { TrueSheetOverlay } from '@lodev09/react-native-true-sheet'
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { GestureDetector, GestureHandlerRootView, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { create } from 'zustand'
import { haptic } from '../haptics'
import { useReducedMotion } from '../motion'
import { Toast, type ToastProps, type ToastTone } from '../primitives/toast'
import { tokens } from '../tokens.generated'

/*
 * Toasts (`toast.md`), inspirés du Toast de Reacticx : pile de 3 au plus, dépliée au toucher ; entrée en ressort une
 * fois le toast mesuré ; balayage vers le haut élastique (résiste vers le bas) avec fondu ; mise à jour en place par
 * identifiant (chargement → succès) avec fondu du contenu ; retour haptique selon le ton.
 */
const DURATION = 4000
const VISIBLE = 3
/** Pile repliée : chaque toast plus ancien dépasse de 10 pt sous le précédent et rétrécit de 5 %. */
const PEEK = 10
const SCALE_STEP = 0.05
/** Pile dépliée : écart entre deux toasts. */
const GAP = tokens.space[3]
/** Ressort « glide » de Reacticx : posé, sans rebond visible. */
const GLIDE = { damping: 32, stiffness: 170, mass: 1, reduceMotion: ReduceMotion.Never }
const EXIT = { duration: 200, easing: Easing.in(Easing.quad), reduceMotion: ReduceMotion.Never }
const FADE = { duration: 300, reduceMotion: ReduceMotion.Never }
/** Sans mesure au bout de 100 ms, l'entrée part quand même (comme Reacticx). */
const MEASURE_GRACE = 100

export interface ToastMessage extends ToastProps {
  /** Même identifiant : le toast est mis à jour en place (chargement → succès) au lieu d'en empiler un autre. */
  id?: string
  /** En ms ; `Infinity` pour un toast qui attend (chargement). 4 s par défaut. */
  duration?: number
}

interface ToastEntry extends ToastMessage {
  id: string
  /** Change à chaque mise à jour : relance la minuterie et le fondu du contenu. */
  version: number
  leaving: boolean
}

interface ToastStore {
  toasts: ToastEntry[]
  /** Écrans immersifs (duel) : les messages attendent la fin de la suspension. */
  pending: ToastEntry[]
  suspended: number
  expanded: boolean
  show: (message: ToastMessage) => string
  dismiss: (id?: string) => void
  remove: (id: string) => void
  setExpanded: (expanded: boolean) => void
  suspend: () => () => void
}

let sequence = 0
const nextId = () => `toast-${++sequence}`

const HAPTICS: Partial<Record<ToastTone, 'success' | 'error' | 'warning'>> = { success: 'success', danger: 'error', warning: 'warning' }

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  pending: [],
  suspended: 0,
  expanded: false,
  show: (message) => {
    const id = message.id ?? nextId()
    const target = get().suspended > 0 ? 'pending' : 'toasts'
    const list = get()[target]
    const existing = list.find((entry) => entry.id === id && !entry.leaving)
    const entry: ToastEntry = { ...message, id, version: (existing?.version ?? 0) + 1, leaving: false }
    // Le plus récent devant ; une mise à jour garde sa place dans la pile.
    set({ [target]: existing ? list.map((item) => (item === existing ? entry : item)) : [entry, ...list] } as Partial<ToastStore>)
    const tone = message.loading ? undefined : HAPTICS[message.tone ?? 'neutral']
    if (target === 'toasts' && tone) haptic(tone)
    return id
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.map((entry) => (id === undefined || entry.id === id ? { ...entry, leaving: true } : entry)) })),
  remove: (id) =>
    set((state) => {
      const toasts = state.toasts.filter((entry) => entry.id !== id)
      return { toasts, expanded: toasts.filter((entry) => !entry.leaving).length > 1 && state.expanded }
    }),
  setExpanded: (expanded) => set({ expanded }),
  suspend: () => {
    set((state) => ({ suspended: state.suspended + 1 }))
    return () =>
      set((state) => {
        const suspended = Math.max(0, state.suspended - 1)
        return suspended === 0 ? { suspended, toasts: [...state.pending, ...state.toasts], pending: [] } : { suspended }
      })
  },
}))

type ToastOptions = Omit<ToastMessage, 'title' | 'tone'>
const typed = (tone: ToastTone) => (title: string, options?: ToastOptions) => useToastStore.getState().show({ ...options, tone, title })

/**
 * API impérative. `toast.show({ tone, title })` reste valable ; raccourcis par ton ; `toast.loading` renvoie un
 * identifiant à réutiliser (`toast.success('Synchronisé', { id })`) ; `toast.promise` suit une opération.
 */
export const toast = {
  show: (message: ToastMessage) => useToastStore.getState().show(message),
  success: typed('success'),
  error: typed('danger'),
  warning: typed('warning'),
  info: typed('info'),
  loading: (title: string, options?: ToastOptions) => useToastStore.getState().show({ duration: Infinity, ...options, tone: 'neutral', loading: true, title }),
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error: string | ((error: unknown) => string); description?: string },
  ) => {
    const id = toast.loading(messages.loading, { description: messages.description })
    promise.then(
      (value) => toast.success(typeof messages.success === 'function' ? messages.success(value) : messages.success, { id, duration: DURATION }),
      (error: unknown) => toast.error(typeof messages.error === 'function' ? messages.error(error) : messages.error, { id, duration: DURATION }),
    )
    return promise
  },
  /** Sans identifiant : ferme tous les toasts. */
  dismiss: (id?: string) => useToastStore.getState().dismiss(id),
}

/**
 * À appeler dans un écran immersif (duel, intros) : aucun toast tant qu'il est monté et `active`. Le duel la lève
 * dès le résultat, pour que les toasts et la proposition de revanche (`RematchHost`) y réapparaissent.
 */
export function useToastSuppression(active = true) {
  useEffect(() => (active ? useToastStore.getState().suspend() : undefined), [active])
}

/** Rubber band asymptotique : `overflow` pt de traction donnent au plus `dim` pt de course (Reacticx). */
function rubberBand(overflow: number, dim: number) {
  'worklet'
  if (!(overflow > 0) || !(dim > 0)) return 0
  return (1 - 1 / ((overflow * 0.55) / dim + 1)) * dim
}

interface ItemProps {
  entry: ToastEntry
  index: number
  /** Position cible dans la pile (calculée par l'hôte). */
  targetY: number
  targetScale: number
  targetOpacity: number
  /** Distance d'entrée et de sortie, au-dessus de l'écran. */
  travel: number
  interactive: boolean
  /** Pile repliée : un toucher sur le toast de devant la déplie (« éventail ») au lieu d'agir sur lui. */
  onExpand?: () => void
  onMeasure: (id: string, height: number) => void
}

function ToastItem({ entry, index, targetY, targetScale, targetOpacity, travel, interactive, onExpand, onMeasure }: ItemProps) {
  const reduced = useReducedMotion()
  const remove = useToastStore((state) => state.remove)
  const dismiss = useToastStore((state) => state.dismiss)
  const expanded = useToastStore((state) => state.expanded)
  const [measured, setMeasured] = useState(false)

  const presence = useSharedValue(0)
  const ty = useSharedValue(targetY)
  const sc = useSharedValue(targetScale)
  const op = useSharedValue(targetOpacity)
  const dragY = useSharedValue(0)
  const contentFade = useSharedValue(1)

  // Entrée : attend la hauteur réelle (sinon le toast part d'une hauteur supposée et se recale en route).
  const entered = useRef(false)
  useEffect(() => {
    const enter = () => {
      if (entered.current) return
      entered.current = true
      presence.value = reduced ? withTiming(1, FADE) : withSpring(1, GLIDE)
    }
    if (measured) enter()
    const timer = setTimeout(enter, MEASURE_GRACE)
    return () => clearTimeout(timer)
  }, [measured, presence, reduced])

  // Place dans la pile : ressort vers la nouvelle cible à chaque changement.
  useEffect(() => {
    ty.value = reduced ? targetY : withSpring(targetY, GLIDE)
    sc.value = reduced ? targetScale : withSpring(targetScale, GLIDE)
    op.value = withTiming(targetOpacity, FADE)
  }, [targetY, targetScale, targetOpacity, reduced, ty, sc, op])

  // Mise à jour en place : le nouveau contenu arrive en fondu.
  const firstVersion = useRef(entry.version)
  useEffect(() => {
    if (entry.version === firstVersion.current) return
    contentFade.value = 0
    contentFade.value = withTiming(1, FADE)
    AccessibilityInfo.announceForAccessibility([entry.title, entry.description].filter(Boolean).join('. '))
  }, [entry.version, entry.title, entry.description, contentFade])

  useEffect(() => {
    if (entry.version === 1) AccessibilityInfo.announceForAccessibility([entry.title, entry.description].filter(Boolean).join('. '))
    // Annonce unique à l'arrivée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Minuterie : relancée à chaque mise à jour, suspendue tant que la pile est dépliée.
  useEffect(() => {
    if (entry.leaving || expanded) return
    const duration = entry.duration ?? DURATION
    if (!Number.isFinite(duration)) return
    const timer = setTimeout(() => dismiss(entry.id), duration)
    return () => clearTimeout(timer)
  }, [entry.id, entry.version, entry.duration, entry.leaving, expanded, dismiss])

  // Sortie : remonte et s'efface, puis quitte la pile.
  useEffect(() => {
    if (!entry.leaving) return
    presence.value = withTiming(0, EXIT, (finished) => {
      if (finished) scheduleOnRN(remove, entry.id)
    })
  }, [entry.leaving, entry.id, presence, remove])

  const pan = usePanGesture({
    enabled: interactive,
    activeOffsetY: [-8, 8],
    failOffsetX: [-16, 16],
    onUpdate: (event) => {
      'worklet'
      // Vers le haut : suit le doigt ; vers le bas : résiste (élastique).
      dragY.value = event.translationY < 0 ? event.translationY : rubberBand(event.translationY, 40)
    },
    onDeactivate: (event) => {
      'worklet'
      if (event.translationY < -45 || event.velocityY < -300) scheduleOnRN(dismiss, entry.id)
      else dragY.value = withSpring(0, GLIDE)
    },
  })
  const tap = useTapGesture({
    enabled: interactive && Boolean(onExpand),
    onActivate: () => {
      'worklet'
      if (onExpand) scheduleOnRN(onExpand)
    },
  })
  // Le balayage l'emporte sur le toucher : un geste vers le haut ferme, il ne déplie pas.
  const gesture = useExclusiveGestures(pan, tap)

  const style = useAnimatedStyle(() => {
    const away = 1 - presence.value
    const swipeFade = 1 - Math.min(1, Math.abs(dragY.value) / 160)
    return {
      opacity: op.value * presence.value * swipeFade,
      transform: [{ translateY: ty.value + (reduced ? 0 : -travel * away) + dragY.value }, { scale: sc.value * (reduced ? 1 : 0.94 + 0.06 * presence.value) }],
    }
  })
  const fade = useAnimatedStyle(() => ({ opacity: contentFade.value }))

  const { id, version: _version, leaving: _leaving, duration: _duration, ...props } = entry
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        pointerEvents={interactive ? 'auto' : 'none'}
        importantForAccessibility={index < VISIBLE ? 'auto' : 'no-hide-descendants'}
        onLayout={(event) => {
          onMeasure(id, event.nativeEvent.layout.height)
          setMeasured(true)
        }}
        style={[{ position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center', zIndex: 100 - index }, style]}
      >
        <Animated.View pointerEvents={onExpand ? 'none' : 'auto'} style={[{ alignSelf: 'stretch', alignItems: 'center' }, fade]}>
          <Toast {...props} onPress={props.onPress && (() => (props.onPress?.(), dismiss(id)))} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  )
}

/** Hôte unique, à la racine : au-dessus des feuilles (`TrueSheetOverlay`), sous la barre d'état. */
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts)
  const expanded = useToastStore((state) => state.expanded)
  const setExpanded = useToastStore((state) => state.setExpanded)
  const insets = useSafeAreaInsets()
  const [heights, setHeights] = useState<Record<string, number>>({})
  const top = insets.top + tokens.space[3]

  const live = toasts.filter((entry) => !entry.leaving)
  const stacked = live.length > 1

  // Pile dépliée sans interaction : elle se replie d'elle-même.
  useEffect(() => {
    if (!expanded) return
    const timer = setTimeout(() => setExpanded(false), DURATION)
    return () => clearTimeout(timer)
  }, [expanded, setExpanded, toasts])

  if (toasts.length === 0) return null

  const heightOf = (id: string) => heights[id] ?? 64
  const frontHeight = live[0] ? heightOf(live[0].id) : 64
  let offset = 0
  const layout = new Map<string, { y: number; scale: number; opacity: number; index: number }>()
  live.forEach((entry, index) => {
    const height = heightOf(entry.id)
    if (expanded) {
      layout.set(entry.id, { y: offset, scale: 1, opacity: index < VISIBLE ? 1 : 0, index })
      offset += height + GAP
    } else {
      // Bas aligné sur celui du toast de devant, puis un liseré de 10 pt par rang.
      layout.set(entry.id, { y: index === 0 ? 0 : frontHeight - height + index * PEEK, scale: 1 - index * SCALE_STEP, opacity: index < VISIBLE ? 1 : 0, index })
    }
  })
  const stackHeight = expanded ? offset - GAP : frontHeight + Math.min(live.length - 1, VISIBLE - 1) * PEEK

  return (
    <TrueSheetOverlay pointerEvents="box-none">
      {/* L'overlay rend ses enfants dans un conteneur natif à part, hors de la racine de l'app : sans racine propre, les
          gestes (balayage, toucher) n'y arrivent jamais. */}
      {/* Racine de gestes limitée à la pile : en plein écran, elle capterait tous les touchers de l'app tant qu'un
          toast est affiché (une racine native ne respecte pas `box-none`). */}
      <GestureHandlerRootView
        style={{ position: 'absolute', top, left: tokens.space[5], right: tokens.space[5], height: Math.max(stackHeight, 0), overflow: 'visible' }}
      >
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'visible' }}>
          {toasts.map((entry) => {
            const place = layout.get(entry.id) ?? { y: 0, scale: 1, opacity: 0, index: VISIBLE }
            return (
              <ToastItem
                key={entry.id}
                entry={entry}
                index={place.index}
                targetY={place.y}
                targetScale={place.scale}
                targetOpacity={place.opacity}
                travel={top + heightOf(entry.id)}
                interactive={!entry.leaving && (expanded || place.index === 0)}
                onExpand={stacked && !expanded && place.index === 0 ? () => setExpanded(true) : undefined}
                onMeasure={(id, height) => setHeights((current) => (current[id] === height ? current : { ...current, [id]: height }))}
              />
            )
          })}
        </View>
      </GestureHandlerRootView>
    </TrueSheetOverlay>
  )
}
