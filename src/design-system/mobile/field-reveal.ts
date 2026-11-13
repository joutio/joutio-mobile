import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { Keyboard, type ViewInstance } from 'react-native'

/**
 * Champ entier au-dessus du clavier (2026-11-13) : le défilement « keyboard-aware » ne garantit que la ligne du
 * curseur (une bio multiligne restait coupée, compteur et aide sous le clavier). Un écran qui défile fournit `reveal` ;
 * le champ s'en sert une fois le clavier affiché, puis quand il grandit.
 */
export type RevealField = (node: ViewInstance) => void

export const FieldRevealContext = createContext<RevealField | null>(null)

/** Délai laissé au défilement du clavier avant de mesurer le champ. */
const SETTLE_MS = 80

/** À poser sur le conteneur d'un champ : `onFocus`, `onBlur` et `onGrow` révèlent tout le champ. */
export function useFieldReveal() {
  const reveal = useContext(FieldRevealContext)
  const container = useRef<ViewInstance>(null)
  const pending = useRef<{ remove: () => void } | null>(null)
  const focused = useRef(false)

  const cancel = useCallback(() => {
    pending.current?.remove()
    pending.current = null
  }, [])
  useEffect(() => cancel, [cancel])

  const run = useCallback(() => {
    const timer = setTimeout(() => container.current && reveal?.(container.current), SETTLE_MS)
    pending.current = { remove: () => clearTimeout(timer) }
  }, [reveal])

  const onFocus = useCallback(() => {
    focused.current = true
    if (!reveal) return
    cancel()
    if (Keyboard.isVisible()) {
      run()
      return
    }
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      subscription.remove()
      run()
    })
    pending.current = subscription
  }, [reveal, cancel, run])

  const onBlur = useCallback(() => {
    focused.current = false
    cancel()
  }, [cancel])

  /** Un champ multiligne qui grandit pendant la saisie reste entier. */
  const onGrow = useCallback(() => {
    if (focused.current && reveal && Keyboard.isVisible()) {
      cancel()
      run()
    }
  }, [reveal, cancel, run])

  return { container, onFocus, onBlur, onGrow }
}
