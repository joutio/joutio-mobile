import { useEffect, useRef } from 'react'
import { ActionSheetIOS, Alert, Platform, type AlertButton } from 'react-native'
import type { ButtonTone, ButtonVariant } from './button-styles'

export interface DialogAction {
  label: string
  variant?: ButtonVariant
  tone?: ButtonTone
  onPress?: () => void
}

export interface DialogOptions {
  title: string
  message?: string
  /** L'action principale en premier. Une action `plain` sert d'annulation. */
  actions: DialogAction[]
  /** Présentation en bas d'écran (feuille d'actions iOS) plutôt qu'au centre. */
  sheet?: boolean
  /** Fermeture sans choix : toucher hors de l'alerte (Android), annulation. */
  onClose?: () => void
}

const isCancel = (action: DialogAction) => action.variant === 'plain'
const isDestructive = (action: DialogAction) => action.tone === 'destructive'

/**
 * Confirmation **native** (UIAlertController, dialog Material) : se déconnecter, abandonner un duel, supprimer.
 * Titre, message et ordre des actions du lab ; l'icône du lab n'existe pas dans une alerte système (`PARITY.md` § 3).
 */
export function showDialog({ title, message, actions, sheet = false, onClose }: DialogOptions) {
  if (sheet && Platform.OS === 'ios') {
    const cancelIndex = actions.findIndex(isCancel)
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: actions.map((action) => action.label),
        cancelButtonIndex: cancelIndex >= 0 ? cancelIndex : undefined,
        destructiveButtonIndex: actions.map((action, index) => (isDestructive(action) ? index : -1)).filter((index) => index >= 0),
      },
      (index) => {
        const action = actions[index]
        if (!action || index === cancelIndex) onClose?.()
        action?.onPress?.()
      },
    )
    return
  }
  // iOS place l'annulation à gauche (ou en bas) d'elle-même ; Android affiche dans l'ordre inverse de lecture.
  const buttons: AlertButton[] = actions.map((action) => ({
    text: action.label,
    style: isCancel(action) ? 'cancel' : isDestructive(action) ? 'destructive' : 'default',
    isPreferred: action === actions[0] && !isCancel(action),
    onPress: () => (isCancel(action) ? (action.onPress ?? onClose)?.() : action.onPress?.()),
  }))
  Alert.alert(title, message, Platform.OS === 'android' ? [...buttons].reverse() : buttons, { cancelable: true, onDismiss: onClose })
}

export interface DialogProps extends DialogOptions {
  open: boolean
  onClose: () => void
}

/** Forme déclarative : l'alerte s'ouvre quand `open` passe à vrai. Le focus est géré par le système. */
export function Dialog({ open, ...options }: DialogProps) {
  const latest = useRef(options)
  latest.current = options
  useEffect(() => {
    if (open) showDialog({ ...latest.current, onClose: latest.current.onClose })
  }, [open])
  return null
}
