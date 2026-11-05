import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BackHandler, useWindowDimensions, View } from 'react-native'
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
 * <p>Le contenu a une hauteur **fixe** (hauteur agrandie moins l'en-tête) : la feuille le découpe au lieu de le
 * redimensionner pendant l'ouverture/fermeture. Le detent de peek est calculé sur la hauteur mesurée du header :
 * au repos, seul l'en-tête est visible, et les onglets/dots/signalement restent dans le contenu — pas de footer
 * TrueSheet, donc rien ne « pop » à l'agrandissement.</p>
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
  const { height } = useWindowDimensions()
  const sheet = useRef<TrueSheet>(null)
  const [expanded, setExpanded] = useState(false)
  // Estimation du header avant mesure : évite un peek trop haut au premier rendu.
  const [headerHeight, setHeaderHeight] = useState(76)
  const scrim = splitScrim(colors.scrim)
  const mounted = useRef(true)
  const activeRef = useRef(active)
  activeRef.current = active

  // Hauteur du contenu agrandi, figée : le contenu ne suit pas la hauteur courante du detent.
  const contentHeight = Math.max(0, height * TALL - headerHeight)

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
      // Contenu de hauteur fixe : pas de `flex: 1`, sinon il suivrait la hauteur du detent courant.
      style={{ flexShrink: 1, minHeight: 0 }}
      header={
        <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
          <SheetHeader title={title} subtitle={expanded ? subtitle : hint} handle={false} />
        </View>
      }
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
      <View style={{ height: contentHeight }}>{children}</View>
    </TrueSheet>
  )
}
