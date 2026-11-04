import { useRef, useState, type ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { focusAccessibility, type ViewRef } from '../a11y'
import { haptic } from '../haptics'
import { CheckIcon, type Icon } from '../icons'
import { useReducedMotion } from '../motion'
import { HAIRLINE, hairlineRing } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export interface MenuItem {
  label: string
  /** Choix courant d'un menu de tri ou de filtre (coche à gauche). */
  checked?: boolean
  /** Icône à droite. */
  icon?: Icon
  destructive?: boolean
  /** Ouvre un nouveau groupe (filet au-dessus). */
  separated?: boolean
  onPress?: () => void
}

export interface MenuProps {
  items: MenuItem[]
  title?: string
  /** Largeur en pt (240 par défaut, comme le lab). */
  width?: number
  /** Déclencheur : reçoit `open`, à brancher sur son `onPress`. */
  children: (open: () => void) => ReactNode
}

/** Écart entre le déclencheur et le menu, et marge minimale aux bords de l'écran. */
const GAP = tokens.space[2]
const EDGE = tokens.space[5]

interface Placement {
  left: number
  top: number
  /** Coin d'ancrage : l'ouverture part de là. */
  origin: 'top left' | 'top right' | 'bottom left' | 'bottom right'
}

/**
 * Menu contextuel Joutio (menu ⋯, tri, filtre), identique sur iOS et Android. Ancré sur son déclencheur, il s'ouvre
 * en ressort depuis le coin du bouton, se place dessous ou dessus selon la place, aligné sur le bord du bouton le
 * plus proche, dans les safe areas. Fermeture : toucher extérieur, retour Android, choix d'une option.
 */
export function Menu({ items, title, width = 240, children }: MenuProps) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const insets = useSafeAreaInsets()
  const window = useWindowDimensions()
  const anchor = useRef<ViewRef>(null)
  const firstItem = useRef<ViewRef>(null)
  const [frame, setFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const progress = useSharedValue(0)
  const selectable = items.some((item) => item.checked !== undefined)

  const open = () => {
    anchor.current?.measureInWindow((x, y, w, h) => {
      haptic('selection')
      setPlacement(null)
      setFrame({ x, y, width: w, height: h })
    })
  }

  const unmount = () => {
    setFrame(null)
    setPlacement(null)
    focusAccessibility(anchor)
  }

  const close = (then?: () => void) => {
    if (reduced) {
      progress.value = 0
      unmount()
      then?.()
      return
    }
    progress.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.quad), reduceMotion: ReduceMotion.Never }, (finished) => {
      if (finished) scheduleOnRN(unmount)
    })
    then?.()
  }

  // Placement une fois la hauteur du menu connue : dessous si ça tient, sinon dessus ; aligné à droite si le bouton
  // est dans la moitié droite de l'écran.
  const place = (menuHeight: number) => {
    if (!frame || placement) return
    const right = frame.x + frame.width / 2 > window.width / 2
    const left = Math.min(Math.max(right ? frame.x + frame.width - width : frame.x, EDGE), window.width - width - EDGE)
    const below = frame.y + frame.height + GAP
    const fitsBelow = below + menuHeight <= window.height - insets.bottom - EDGE
    const top = fitsBelow ? below : Math.max(insets.top + EDGE, frame.y - GAP - menuHeight)
    setPlacement({ left, top, origin: `${fitsBelow ? 'top' : 'bottom'} ${right ? 'right' : 'left'}` })
    progress.value = 0
    progress.value = reduced ? 1 : withSpring(1, { mass: 1, stiffness: 520, damping: 34, reduceMotion: ReduceMotion.Never })
    focusAccessibility(firstItem)
  }

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.6),
    transform: [{ scale: 0.86 + 0.14 * progress.value }],
  }))

  return (
    <>
      <View ref={anchor} collapsable={false} style={{ alignSelf: 'flex-start' }}>
        {children(open)}
      </View>
      <Modal visible={frame !== null} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => close()}>
        <Pressable accessibilityLabel="Fermer le menu" accessibilityRole="button" onPress={() => close()} style={StyleSheet.absoluteFill} />
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="menu"
          accessibilityLabel={title}
          onLayout={(event) => place(event.nativeEvent.layout.height)}
          style={[
            {
              position: 'absolute',
              left: placement?.left ?? 0,
              top: placement?.top ?? 0,
              width,
              maxWidth: window.width - EDGE * 2,
              padding: tokens.space[2],
              borderRadius: radius.lg,
              backgroundColor: colors.raised,
              boxShadow: `${colors.shadow}, ${hairlineRing(colors.border)}`,
              transformOrigin: placement?.origin ?? 'top right',
              // Invisible tant que la position n'est pas calculée.
              opacity: placement ? undefined : 0,
            },
            placement ? animated : null,
          ]}
        >
          {title && (
            <Text
              variant="caption"
              weight="600"
              color="muted"
              style={{ paddingHorizontal: tokens.space[4], paddingTop: tokens.space[3], paddingBottom: tokens.space[2] }}
            >
              {title}
            </Text>
          )}
          {items.map((item, index) => {
            const { label, checked, icon: IconComponent, destructive, separated, onPress } = item
            const color = destructive ? colors.wrong : colors.text
            return (
              <View key={label}>
                {separated && index > 0 && (
                  <View style={{ height: HAIRLINE, backgroundColor: colors.border, marginVertical: tokens.space[2], marginHorizontal: tokens.space[3] }} />
                )}
                <PressableScale
                  ref={index === 0 ? firstItem : undefined}
                  accessibilityRole={selectable ? 'radio' : 'menuitem'}
                  accessibilityLabel={label}
                  accessibilityState={selectable ? { checked: Boolean(checked) } : undefined}
                  pressedScale={1}
                  ripple
                  haptic="selection"
                  onPress={() => close(onPress)}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: tokens.space[3],
                    paddingHorizontal: tokens.space[4],
                    borderRadius: radius.md,
                    overflow: 'hidden',
                    backgroundColor: pressed ? colors.hover : 'transparent',
                  })}
                >
                  {selectable && <View style={{ width: 20 }}>{checked && <CheckIcon size={16} color={colors.accentInk} />}</View>}
                  <Text numberOfLines={1} color={color} style={{ flex: 1 }}>
                    {label}
                  </Text>
                  {IconComponent && <IconComponent size={18} color={color} />}
                </PressableScale>
              </View>
            )
          })}
        </Animated.View>
      </Modal>
    </>
  )
}
