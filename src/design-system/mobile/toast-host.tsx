import { TrueSheetOverlay } from '@lodev09/react-native-true-sheet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { create } from 'zustand'
import { animateTo, timing, useReducedMotion } from '../motion'
import { Toast, type ToastProps } from '../primitives/toast'
import { tokens } from '../tokens.generated'

/** `toast.md` : 4 s, entrée 240 ms avec glissement de 16 pt, sortie par balayage vers le haut. */
const DURATION = 4000
const ENTER = 240
const SLIDE = 16

export interface ToastMessage extends ToastProps {
  /** Un nouveau toast remplace le précédent ; à identifiant égal, il le met à jour. */
  id?: string
}

interface ToastStore {
  current: (ToastMessage & { key: number }) | null
  /** Écrans immersifs (duel) : le dernier message attend la fin de la suspension. */
  pending: (ToastMessage & { key: number }) | null
  suspended: number
  show: (message: ToastMessage) => void
  dismiss: () => void
  suspend: () => () => void
}

let sequence = 0

export const useToastStore = create<ToastStore>((set, get) => ({
  current: null,
  pending: null,
  suspended: 0,
  show: (message) => {
    const entry = { ...message, key: ++sequence }
    if (get().suspended > 0) set({ pending: entry })
    else set({ current: entry })
  },
  dismiss: () => set({ current: null }),
  suspend: () => {
    set((state) => ({ suspended: state.suspended + 1 }))
    return () =>
      set((state) => {
        const suspended = Math.max(0, state.suspended - 1)
        return suspended === 0 && state.pending ? { suspended, current: state.pending, pending: null } : { suspended }
      })
  },
}))

/** API impérative : `toast.show({ tone: 'success', title: 'Défi envoyé' })`. */
export const toast = {
  show: (message: ToastMessage) => useToastStore.getState().show(message),
  dismiss: () => useToastStore.getState().dismiss(),
}

/** À appeler dans un écran immersif (duel, intros) : aucun toast tant qu'il est monté. */
export function useToastSuppression() {
  useEffect(() => useToastStore.getState().suspend(), [])
}

/** Hôte unique, à la racine : au-dessus des feuilles (`TrueSheetOverlay`), sous la barre d'état. */
export function ToastHost() {
  const current = useToastStore((state) => state.current)
  const dismiss = useToastStore((state) => state.dismiss)
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const offset = useSharedValue(-SLIDE)
  const opacity = useSharedValue(0)
  const [height, setHeight] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    const away = -(height + insets.top + tokens.space[3])
    // Sous mouvement réduit : fondu seul.
    if (reduced) animateTo(opacity, 0, 'exit', false, dismiss)
    else animateTo(offset, away, 'exit', false, dismiss)
  }, [dismiss, height, insets.top, offset, opacity, reduced])

  useEffect(() => {
    if (!current) return
    offset.value = reduced ? 0 : -SLIDE
    opacity.value = 0
    opacity.value = withTiming(1, timing('micro', ENTER))
    if (!reduced) offset.value = withTiming(0, timing('micro', ENTER))
    AccessibilityInfo.announceForAccessibility([current.title, current.description].filter(Boolean).join('. '))
    timer.current = setTimeout(hide, DURATION)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // `hide` change avec la hauteur mesurée : seul un nouveau message relance la minuterie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key])

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (event) => {
      'worklet'
      offset.value = Math.min(0, event.translationY)
    },
    onDeactivate: (event) => {
      'worklet'
      if (event.translationY < -24 || event.velocityY < -500) scheduleOnRN(hide)
      else offset.value = withTiming(0, timing('micro'))
    },
  })

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: offset.value }] }))

  if (!current) return null
  const { id: _id, key: _key, ...props } = current
  return (
    <TrueSheetOverlay pointerEvents="box-none">
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: insets.top + tokens.space[3], left: tokens.space[5], right: tokens.space[5], alignItems: 'center' }}
      >
        <GestureDetector gesture={pan}>
          <Animated.View onLayout={(event) => setHeight(event.nativeEvent.layout.height)} style={[{ alignSelf: 'stretch', alignItems: 'center' }, animated]}>
            <Toast
              {...props}
              action={
                props.action && {
                  ...props.action,
                  onPress: () => {
                    props.action?.onPress?.()
                    hide()
                  },
                }
              }
              onPress={
                props.onPress &&
                (() => {
                  props.onPress?.()
                  hide()
                })
              }
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </TrueSheetOverlay>
  )
}
