import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BackHandler, View } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { SheetHeader } from './sheet-header'

const TALL = 0.92

export interface PeekSheetProps {
  title: string
  /** Sous-titre affiché une fois la feuille agrandie. */
  subtitle?: string
  /** Invite affichée au repos, à la place du sous-titre. */
  hint?: string
  /** Écran au premier plan : la feuille se présente ; sinon elle se retire (chat poussé, navigation). */
  active?: boolean
  onExpandedChange?: (expanded: boolean) => void
  children: ReactNode
}

/** `rgba(r,g,b,a)` → couleur opaque et opacité, pour le voile natif. */
const splitScrim = (scrim: string) => {
  const [r = 0, g = 0, b = 0, a = 1] = scrim.match(/[\d.]+/g)?.map(Number) ?? []
  return { color: `rgb(${r},${g},${b})`, opacity: a }
}

/**
 * Feuille persistante d'un écran immersif, en `peek` puis agrandie à 92 %.
 *
 * <p>Pattern TrueSheet : `style={{ flex: 1 }}` fait remplir au contenu la hauteur visible de la feuille et le
 * `ScrollView` branché sur `scrollableRef` porte tout le contenu — y compris les dots et le signalement. Pas de
 * `footer` TrueSheet : rien ne « pop » à l'agrandissement, et le contenu défile sous son propre en-tête.</p>
 */
export function PeekSheet({
  title,
  subtitle,
  hint = 'Glisse vers le haut pour revoir les questions',
  active = true,
  onExpandedChange,
  children,
}: PeekSheetProps) {
  const { colors, radius } = useTheme()
  const sheet = useRef<TrueSheet>(null)
  const [expanded, setExpanded] = useState(false)
  const scrim = splitScrim(colors.scrim)
  const mounted = useRef(true)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      sheet.current?.dismiss().catch(() => undefined)
    }
  }, [])

  // L'écran redevient visible (retour du chat, focus) : la feuille revient au peek si elle avait été retirée.
  useEffect(() => {
    if (!active) {
      sheet.current?.dismiss().catch(() => undefined)
      return
    }
    const frame = requestAnimationFrame(() => sheet.current?.present(0).catch(() => undefined))
    return () => cancelAnimationFrame(frame)
  }, [active])

  // Retour Android : replie d'abord la feuille agrandie, puis laisse le résultat gérer le retour.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!expanded) return false
      sheet.current?.resize(0).catch(() => undefined)
      return true
    })
    return () => subscription.remove()
  }, [expanded])

  const change = (next: boolean) => {
    setExpanded(next)
    onExpandedChange?.(next)
  }
  const syncDetent = (event: { nativeEvent: { index: number } }) => change(event.nativeEvent.index > 0)

  return (
    <TrueSheet
      ref={sheet}
      detents={['peek', TALL]}
      initialDetentIndex={0}
      // Persistante : le X du résultat quitte l'écran, la feuille ne se referme pas toute seule. Au peek, le fond
      // reste interactif (Message, Signaler, X) ; agrandie, elle prend le voile et bloque le fond.
      dismissible={false}
      draggable
      dimmed={expanded}
      dimmedDetentIndex={1}
      dimColor={scrim.color}
      dimOpacity={scrim.opacity}
      cornerRadius={radius.xl}
      backgroundColor={colors.surface}
      grabber
      grabberOptions={{ color: colors.border }}
      accessibilityOptions={{ paneTitle: title }}
      // Pattern documenté : le contenu remplit la hauteur visible à chaque detent.
      style={{ flex: 1 }}
      header={<SheetHeader title={title} subtitle={expanded ? subtitle : hint} handle={false} />}
      onDetentChange={syncDetent}
      // `onDetentChange` ne suit pas toujours une présentation/fermeture : on recale l'état sur ces événements.
      onDidPresent={syncDetent}
      onDragEnd={syncDetent}
      // Une fermeture accidentelle (glissement trop bas, reconstruction) ramène la feuille au peek tant qu'on est actif.
      onDidDismiss={() => {
        change(false)
        if (mounted.current && activeRef.current) sheet.current?.present(0).catch(() => undefined)
      }}
    >
      {/*
        Contenu monté dès le peek (images et pager prêts) : l'agrandissement n'attend aucun montage. La vue remplit
        la hauteur visible ; les dots et le signalement vivent dans son contenu, pas dans un pied natif.
      */}
      <View style={{ flex: 1 }}>{children}</View>
    </TrueSheet>
  )
}
