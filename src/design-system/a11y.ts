import { useEffect, useRef, type ComponentRef, type RefObject } from 'react'
import { AccessibilityInfo, findNodeHandle, type View } from 'react-native'

/** Instance native d'une View, pour les refs. */
export type ViewRef = ComponentRef<typeof View>

type Focusable = RefObject<ViewRef | null>

/** Porte le focus du lecteur d'écran sur `ref` (après le rendu natif). */
export function focusAccessibility(ref: Focusable | undefined) {
  const node = ref?.current ? findNodeHandle(ref.current) : null
  if (node) setTimeout(() => AccessibilityInfo.setAccessibilityFocus(node), 50)
}

/**
 * Dialog, feuille, carte de revanche (kit § 6) : le focus entre à l'ouverture (`initial`) et revient
 * à `returnTo` (l'élément qui a ouvert) à la fermeture.
 */
export function useModalFocus(open: boolean, initial: Focusable, returnTo?: Focusable) {
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) focusAccessibility(initial)
    else if (wasOpen.current) focusAccessibility(returnTo)
    wasOpen.current = open
  }, [open, initial, returnTo])
}
