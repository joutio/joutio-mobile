import { TrueSheet, TrueSheetPeek } from '@lodev09/react-native-true-sheet'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { BackHandler, useWindowDimensions, View } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { SheetHeader } from './sheet-header'

const TALL = 0.92

export interface PeekSheetProps {
  title: string
  /** Invite sous le titre, identique au repos et agrandie : l'en-tête garde sa hauteur pendant le geste. */
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

/** Partie du contenu visible au repos (onglets des manches) : le detent `peek` s'arrête sous elle. */
export const PeekSheetPeek = TrueSheetPeek

/**
 * Feuille persistante d'un écran immersif, en `peek` puis agrandie à 92 %.
 *
 * <p>Le contenu a une hauteur **fixe** (hauteur agrandie moins l'en-tête) : la feuille le découpe au lieu de le
 * redimensionner pendant l'ouverture/fermeture. Au repos, l'en-tête et ce que le contenu place dans
 * `PeekSheetPeek` restent visibles. Rien ne change pendant le geste : en-tête figé (une ligne), voile porté par le
 * detent natif (`dimmedDetentIndex`), pas de footer TrueSheet — donc rien ne « pop » ni ne se remesure.</p>
 */
export function PeekSheet({ title, hint = 'Glisse vers le haut pour revoir les questions', active = true, onExpandedChange, children }: PeekSheetProps) {
  const { colors, radius } = useTheme()
  const { height } = useWindowDimensions()
  const sheet = useRef<TrueSheet>(null)
  const expanded = useRef(false)
  // Estimation du header avant mesure : évite un peek trop haut au premier rendu. Mesuré une fois au montage (au
  // repos), il ne change plus ensuite : le sous-titre est fixe et tient sur une ligne.
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
      if (!expanded.current) return false
      sheet.current?.resize(0).catch(() => undefined)
      return true
    })
    return () => subscription.remove()
  }, [])

  // État du detent tenu dans une ref : le geste ne re-rend ni la feuille ni son contenu, seul l'appelant est notifié
  // (et seulement quand l'état change).
  const onChangeRef = useRef(onExpandedChange)
  onChangeRef.current = onExpandedChange
  const change = useCallback((next: boolean) => {
    if (expanded.current === next) return
    expanded.current = next
    onChangeRef.current?.(next)
  }, [])
  const syncDetent = useCallback((event: { nativeEvent: { index: number } }) => change(event.nativeEvent.index > 0), [change])

  return (
    <TrueSheet
      ref={sheet}
      detents={['peek', TALL]}
      initialDetentIndex={0}
      // Persistante : le X du résultat quitte l'écran, la feuille ne se referme pas toute seule. Au peek, le fond
      // reste interactif (Message, Signaler, X) ; agrandie, elle prend le voile et bloque le fond.
      dismissible={false}
      draggable
      // Voile constant, à partir du detent agrandi : aucun changement de prop natif pendant le geste.
      dimmed
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
        <View
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.height)
            setHeaderHeight((current) => (current === next ? current : next))
          }}
        >
          <SheetHeader title={title} subtitle={hint} subtitleLines={1} handle={false} />
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
