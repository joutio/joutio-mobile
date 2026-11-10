import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { animateTo, useReducedMotion } from '../motion'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export type Detent = 'peek' | 'half' | 'full'

const ORDER: readonly Detent[] = ['peek', 'half', 'full']
/** Hauteurs `half` et `full`, en fraction de la zone sous la barre du haut (lab : 58 % et 94 %). */
const FRACTIONS = { half: 0.58, full: 0.94 }
/** Geste au-delà duquel on passe au cran suivant (lab : 24 px). */
const STEP = 24
const VALUE_TEXT: Record<Detent, string> = { peek: 'Réduite', half: 'À moitié', full: 'Plein écran' }

export interface DetentSheetProps {
  /** Nom accessible de la feuille. */
  label: string
  detent: Detent
  onDetentChange: (detent: Detent) => void
  /** Toujours visible sous la poignée : le résumé lisible au cran `peek`. */
  header: ReactNode
  /** Actions épinglées en bas, quel que soit le cran, avec la safe area basse. */
  footer?: ReactNode
  /** Hauteur du cran `peek` mesurée (poignée, résumé, pied) : l'écran réserve cette place sous son contenu. */
  onPeekHeight?: (height: number) => void
  /** Figée au `peek`, sans poignée : rien à déplier. */
  locked?: boolean
  children?: ReactNode
}

/**
 * Feuille **persistante** à crans (`navigation.md`, DetentSheet), posée dans l'écran, jamais modale : contrairement à
 * `MobileSheet` (TrueSheet, présentée par-dessus la navigation), elle laisse le retour, le pager et l'éditeur plein
 * écran fonctionner normalement. Le cran `peek` montre exactement la poignée, le résumé et le pied ; `half` et `full`
 * suivent la zone disponible. On tire la poignée (le panneau suit le doigt, en `transform` seulement) ; au relâcher,
 * un geste de 24 pt passe au cran voisin. Toucher la poignée monte d'un cran, puis revient au `peek` depuis le haut.
 * Le contenu défile au cran `full`.
 */
export function DetentSheet({ label, detent, onDetentChange, header, footer, onPeekHeight, locked = false, children }: DetentSheetProps) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const [area, setArea] = useState(0)
  const [headHeight, setHeadHeight] = useState(0)
  const [footHeight, setFootHeight] = useState(0)
  const peek = headHeight + footHeight
  const full = Math.max(peek, Math.round(area * FRACTIONS.full))
  const heightOf = (value: Detent) => (locked || value === 'peek' ? peek : Math.max(peek, Math.round(area * FRACTIONS[value])))
  const shown = locked ? 'peek' : detent
  // Translation du panneau (hauteur `full`) : 0 = plein écran, `full - peek` = réduit.
  const offset = useSharedValue(0)
  const start = useSharedValue(0)
  const measured = area > 0 && headHeight > 0

  useEffect(() => {
    onPeekHeight?.(peek)
  }, [peek, onPeekHeight])

  useEffect(() => {
    if (!measured) return
    animateTo(offset, full - heightOf(shown), 'sheet', reduced)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- heightOf dépend des mêmes mesures
  }, [shown, full, peek, measured, reduced])

  const heights = { peek: heightOf('peek'), half: heightOf('half'), full: heightOf('full') }
  const settle = (moved: number, current: number) => {
    const index = ORDER.indexOf(shown)
    if (Math.abs(moved) < STEP) return animateTo(offset, full - heights[shown], 'sheet', reduced)
    const nearest = ORDER.reduce((best, value) => (Math.abs(heights[value] - current) < Math.abs(heights[best] - current) ? value : best), shown)
    const stepped = ORDER[Math.min(ORDER.length - 1, Math.max(0, index + (moved > 0 ? 1 : -1)))] ?? shown
    const next = nearest === shown ? stepped : nearest
    if (next === shown) animateTo(offset, full - heights[shown], 'sheet', reduced)
    else onDetentChange(next)
  }

  const pan = usePanGesture({
    enabled: !locked && measured,
    activeOffsetY: [-6, 6],
    onActivate: () => {
      'worklet'
      start.value = offset.value
    },
    onUpdate: (event) => {
      'worklet'
      offset.value = Math.min(full - peek, Math.max(0, start.value + event.translationY))
    },
    onDeactivate: (event) => {
      'worklet'
      scheduleOnRN(settle, -event.translationY, full - offset.value)
    },
  })

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }))
  const step = (direction: 1 | -1) => {
    const next = ORDER[ORDER.indexOf(shown) + direction]
    if (next) onDetentChange(next)
  }

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      onLayout={(event) => setArea(event.nativeEvent.layout.height)}
    >
      <Animated.View
        accessibilityLabel={label}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: full || undefined,
            opacity: measured ? 1 : 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderTopWidth: HAIRLINE,
            borderColor: colors.border,
            overflow: 'hidden',
          },
          panelStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View collapsable={false} onLayout={(event: LayoutChangeEvent) => setHeadHeight(event.nativeEvent.layout.height)}>
            {locked ? (
              <View style={{ height: tokens.space[4] }} />
            ) : (
              <Pressable
                accessibilityRole="adjustable"
                accessibilityLabel={`Hauteur de « ${label} »`}
                accessibilityValue={{ text: VALUE_TEXT[shown] }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
                onPress={() => onDetentChange(shown === 'full' ? 'peek' : (ORDER[ORDER.indexOf(shown) + 1] ?? 'full'))}
                hitSlop={{ top: 8, bottom: 8 }}
                style={{ alignItems: 'center', paddingTop: tokens.space[2], paddingBottom: tokens.space[3] }}
              >
                <View style={{ width: 36, height: 5, borderRadius: radius.full, backgroundColor: colors.border }} />
              </Pressable>
            )}
            <View style={{ paddingHorizontal: tokens.space[5], paddingBottom: tokens.space[3] }}>{header}</View>
          </View>
        </GestureDetector>
        <ScrollView
          scrollEnabled={shown === 'full'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: tokens.space[3],
            paddingHorizontal: tokens.space[5],
            paddingTop: tokens.space[1],
            paddingBottom: footHeight + tokens.space[4],
          }}
        >
          {children}
        </ScrollView>
      </Animated.View>
      {footer || locked ? (
        <View
          onLayout={(event) => setFootHeight(event.nativeEvent.layout.height)}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: tokens.space[5],
            paddingTop: footer ? tokens.space[3] : 0,
            paddingBottom: insets.bottom + (footer ? tokens.space[3] : tokens.space[4]),
            backgroundColor: colors.surface,
            borderTopWidth: footer ? HAIRLINE : 0,
            borderColor: colors.border,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  )
}
