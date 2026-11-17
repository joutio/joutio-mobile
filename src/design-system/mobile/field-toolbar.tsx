import { KeyboardController, KeyboardToolbar } from 'react-native-keyboard-controller'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { useT } from '@/lib/i18n'

/** Hauteur de la barre (`KEYBOARD_TOOLBAR_HEIGHT` de keyboard-controller) : à ajouter au `bottomOffset` du défilement. */
export const FIELD_TOOLBAR_HEIGHT = 42

/** Touche « Suivant » d'un champ d'une ligne : le focus passe au champ suivant de l'écran, comme la flèche de la barre. */
export const focusNextField = () => KeyboardController.setFocusTo('next')

/**
 * Barre au-dessus du clavier d'un formulaire à plusieurs champs (‹ › puis OK), comme la barre native des navigateurs
 * mobiles : `KeyboardToolbar` de keyboard-controller, qui parcourt les champs de l'écran dans l'ordre et ferme le
 * clavier. Teintée par les tokens ; à poser une fois, après le défilement du formulaire.
 */
export function FieldToolbar() {
  const t = useT()
  const { colors } = useTheme()
  const tint = { primary: colors.text, disabled: alpha(colors.muted, 0.5), background: colors.surface, ripple: alpha(colors.text, 0.12) }
  return (
    <KeyboardToolbar theme={{ light: tint, dark: tint }}>
      <KeyboardToolbar.Prev />
      <KeyboardToolbar.Next />
      <KeyboardToolbar.Done text={t('ds.keyboardDone')} />
    </KeyboardToolbar>
  )
}
