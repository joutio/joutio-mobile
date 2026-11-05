import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { create } from 'zustand'
import { focusAccessibility, type ViewRef } from '../a11y'
import { haptic } from '../haptics'
import type { Icon } from '../icons'
import { useReducedMotion } from '../motion'
import { alpha } from '../theme/color'
import { ForceDark, useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Button } from './button'
import type { ButtonTone, ButtonVariant } from './button-styles'
import { Text } from './text'

export interface DialogAction {
  label: string
  variant?: ButtonVariant
  tone?: ButtonTone
  onPress?: () => void
}

export type DialogTone = 'neutral' | 'accent' | 'danger'

export interface DialogOptions {
  title: string
  message?: string
  /** Icône dans une tuile de 56 pt, au-dessus du titre. */
  icon?: Icon
  /** Couleur de la tuile : `neutral` (`raised`), `accent` (`warm`), `danger` (`wrong` à 16 %). */
  tone?: DialogTone
  /** L'action principale en premier. Une action `plain` sert d'annulation. */
  actions: DialogAction[]
  /** Présentation en bas d'écran plutôt qu'au centre. */
  sheet?: boolean
  /** Confirmation d'un écran immersif : le panneau reste sombre même si le thème système est clair. */
  forceDark?: boolean
  /** Fermeture sans choix (voile, retour Android) ; avec `showDialog` uniquement. */
  onClose?: () => void
}

export interface DialogProps extends DialogOptions {
  open: boolean
  /** Toute fermeture : voile, retour Android, choix d'une action (appelé avant son `onPress`). */
  onClose: () => void
}

/** Mouvement du `Menu` : ouverture en ressort, fermeture en 140 ms. */
const OPEN_SPRING = { mass: 1, stiffness: 520, damping: 34, reduceMotion: ReduceMotion.Never }
const CLOSE_TIMING = { duration: 140, easing: Easing.in(Easing.quad), reduceMotion: ReduceMotion.Never }

/**
 * Confirmation Joutio (`feedback.md` § Dialog) : se déconnecter, abandonner un duel, quitter un salon, supprimer.
 * Centrée (320 pt max) ou en feuille basse ; tuile d'icône, titre, message, actions pleine largeur empilées.
 * Même mouvement que `Menu` : le panneau grandit de 86 % à 100 % en ressort (depuis son centre, ou son bord bas en
 * feuille), le voile suit ; la fermeture le rétracte en 140 ms. Sous mouvement réduit, il apparaît d'un coup.
 */
export function Dialog({ open, onClose, title, message, icon: IconComponent, tone = 'neutral', actions, sheet = false }: DialogProps) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const titleRef = useRef<ViewRef>(null)
  const [mounted, setMounted] = useState(open)
  const progress = useSharedValue(0)

  useEffect(() => {
    if (open) {
      setMounted(true)
      haptic(tone === 'danger' ? 'warning' : 'light')
      focusAccessibility(titleRef)
      progress.value = 0
      progress.value = reduced ? 1 : withSpring(1, OPEN_SPRING)
      return
    }
    if (reduced) {
      progress.value = 0
      setMounted(false)
      return
    }
    progress.value = withTiming(0, CLOSE_TIMING, (finished) => {
      if (finished) scheduleOnRN(setMounted, false)
    })
  }, [open, reduced, tone, progress])

  const scrimStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value * 1.6) }))
  const panelStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.6),
    transform: [{ scale: 0.86 + 0.14 * progress.value }],
  }))

  if (!mounted && !open) return null

  const tile = {
    neutral: { backgroundColor: colors.raised, color: colors.text },
    accent: { backgroundColor: colors.warm, color: colors.accentInk },
    danger: { backgroundColor: alpha(colors.wrong, 0.16), color: colors.wrong },
  }[tone]

  // Choisir une action ferme toujours le dialog.
  const choose = (action: DialogAction) => {
    onClose()
    action.onPress?.()
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { justifyContent: sheet ? 'flex-end' : 'center', alignItems: 'center', paddingHorizontal: sheet ? 0 : tokens.space[4] },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <Pressable
            accessibilityLabel="Fermer"
            accessibilityRole="button"
            onPress={onClose}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            {
              width: '100%',
              maxWidth: sheet ? undefined : 320,
              alignItems: 'center',
              gap: tokens.space[2],
              paddingHorizontal: tokens.space[4],
              paddingTop: tokens.space[6],
              paddingBottom: tokens.space[4] + (sheet ? insets.bottom : 0),
              backgroundColor: colors.surface,
              borderRadius: sheet ? 0 : radius.xl,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              boxShadow: colors.shadow,
              transformOrigin: sheet ? 'bottom' : 'center',
            },
            panelStyle,
          ]}
        >
          {IconComponent && (
            <View
              style={{
                width: 56,
                height: 56,
                marginBottom: tokens.space[1],
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tile.backgroundColor,
              }}
            >
              <IconComponent size={28} weight="fill" color={tile.color} />
            </View>
          )}
          <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={title}>
            <Text variant="title2" align="center">
              {title}
            </Text>
          </View>
          {message && (
            <Text color="muted" align="center">
              {message}
            </Text>
          )}
          <View style={{ alignSelf: 'stretch', marginTop: tokens.space[3], gap: tokens.space[2] }}>
            {actions.map((action) => {
              const variant = action.variant ?? 'gray'
              return (
                <Button
                  key={action.label}
                  full
                  variant={variant}
                  tone={action.tone ?? (variant === 'filled' ? 'accent' : 'neutral')}
                  size={variant === 'plain' ? 'M' : 'L'}
                  onPress={() => choose(action)}
                >
                  {action.label}
                </Button>
              )
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

interface DialogStore {
  current: (DialogOptions & { key: number }) | null
  open: boolean
  show: (options: DialogOptions) => void
  close: () => void
}

let sequence = 0

const useDialogStore = create<DialogStore>((set) => ({
  current: null,
  open: false,
  show: (options) => set({ current: { ...options, key: ++sequence }, open: true }),
  close: () => set({ open: false }),
}))

/** Confirmation impérative, rendue par `DialogHost` (monté une fois dans le layout racine). */
export function showDialog(options: DialogOptions) {
  useDialogStore.getState().show(options)
}

/** Hôte des `showDialog` : un dialog à la fois, le suivant remplace le précédent. */
export function DialogHost() {
  const current = useDialogStore((state) => state.current)
  const open = useDialogStore((state) => state.open)
  const close = useDialogStore((state) => state.close)
  const chosen = useRef(false)
  if (!current) return null
  const { key, forceDark, ...options } = current
  const dialog = (
    <Dialog
      key={key}
      {...options}
      actions={current.actions.map((action) => ({
        ...action,
        onPress: () => {
          chosen.current = true
          action.onPress?.()
        },
      }))}
      open={open}
      onClose={() => {
        close()
        // `choose` ferme avant d'appeler l'action : on attend la fin du tour pour savoir s'il y a eu un choix.
        queueMicrotask(() => {
          if (!chosen.current) options.onClose?.()
          chosen.current = false
        })
      }}
    />
  )
  return forceDark ? <ForceDark>{dialog}</ForceDark> : dialog
}
