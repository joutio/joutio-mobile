import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { Platform, useWindowDimensions, View, type ScrollViewInstance } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModalFocus, type ViewRef } from '../a11y'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { ScrollToTopPill } from './scroll-to-top-pill'
import { SheetHeader } from './sheet-header'

/** Hauteur maximale d'une feuille ajustée à son contenu, et hauteur fixe d'une grande feuille. */
const MAX_HEIGHT = 0.8
const TALL_HEIGHT = 0.92

export interface MobileSheetProps {
  open: boolean
  /** Fermeture demandée : bouton Fermer, voile, balayage, retour Android. */
  onClose: () => void
  title: string
  subtitle?: string
  onBack?: () => void
  action?: ReactNode
  /** Hauteur fixe de 92 % : le contenu remplit l'espace (listes, recherche). */
  tall?: boolean
  /** Actions, toujours visibles sous le contenu qui défile. */
  footer?: ReactNode
  /** Zone collée en haut du contenu (recherche d'une liste) : `stickyHeaderIndices`, fond `surface`. */
  stickyHeader?: ReactNode
  /** Rend le focus à l'élément qui a ouvert la feuille. */
  returnFocusTo?: RefObject<ViewRef | null>
  /** Feuille effectivement présentée : permet de monter son contenu lourd après l'ouverture native. */
  onDidPresent?: () => void
  /**
   * Feuille entièrement retirée (toute fermeture) : y enchaîner un `Dialog` ou un `Menu` (des `Modal`), jamais pendant
   * la fermeture — présentés depuis une feuille qui se retire, ils plantent sur iOS.
   */
  onDismissed?: () => void
  children: ReactNode
}

/** Feuille flottante (iOS 26) : détachée du bas de l'écran, sans safe area basse à réserver. */
const FLOATING = Platform.OS === 'ios'

/** `rgba(r,g,b,a)` → couleur opaque et opacité, pour le voile natif. */
const splitScrim = (scrim: string) => {
  const [r = 0, g = 0, b = 0, a = 1] = scrim.match(/[\d.]+/g)?.map(Number) ?? []
  return { color: `rgb(${r},${g},${b})`, opacity: a }
}

/**
 * Feuille modale par le bas, native (TrueSheet). Ajustée au contenu jusqu'à 80 %, ou `tall` à 92 %.
 * Contenu démonté une fois fermée. Une étape suivante s'empile dans une nouvelle feuille (`foundations.md` § 11).
 */
export function MobileSheet({
  open,
  onClose,
  title,
  subtitle,
  onBack,
  action,
  tall = false,
  footer,
  stickyHeader,
  returnFocusTo,
  onDidPresent,
  onDismissed,
  children,
}: MobileSheetProps) {
  const { colors, radius } = useTheme()
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const sheet = useRef<TrueSheet>(null)
  const scroller = useRef<ScrollViewInstance>(null)
  const offset = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y
  })
  const titleRef = useRef<ViewRef>(null)
  const presented = useRef(false)
  const scrim = splitScrim(colors.scrim)

  useEffect(() => {
    if (open && !presented.current) {
      presented.current = true
      sheet.current?.present().catch(() => undefined)
    } else if (!open && presented.current) {
      presented.current = false
      sheet.current?.dismiss().catch(() => undefined)
    }
  }, [open])

  useModalFocus(open, titleRef, returnFocusTo)

  return (
    <TrueSheet
      ref={sheet}
      detents={tall ? [TALL_HEIGHT] : ['auto']}
      maxContentHeight={tall ? undefined : height * MAX_HEIGHT}
      cornerRadius={radius.xl}
      backgroundColor={colors.surface}
      dimColor={scrim.color}
      dimOpacity={scrim.opacity}
      grabber
      grabberOptions={{ color: colors.border }}
      accessibilityOptions={{ paneTitle: title }}
      scrollableRef={scroller}
      // Contenu plus haut que la feuille (grand texte, petit écran) : la vue de contenu et le défilement rétrécissent à
      // la hauteur plafonnée, sinon ils gardent leur hauteur naturelle, ne défilent pas et poussent le pied hors écran.
      style={{ flexShrink: 1, minHeight: 0 }}
      header={<SheetHeader title={title} subtitle={subtitle} onBack={onBack} action={action} onClose={onClose} titleRef={titleRef} handle={false} />}
      // Actions dans leur propre zone, collée au bas de la feuille, comme l'en-tête en haut. Pied `absolute` (2026-11-06) :
      // un pied `relative` reste derrière le clavier, le bouton d'enregistrement disparaissait pendant la saisie ; en
      // `absolute`, il remonte au-dessus du clavier, et le défilement réserve sa hauteur (`contentInsetAdjustment`
      // automatique) : le contenu ne passe jamais sous le bouton.
      footerOptions={footer ? { position: 'absolute' } : undefined}
      // Android : fermeture au balayage court, comme la feuille Material 3 (sur iOS, le geste reste celui du système).
      dismissThreshold="short"
      // iOS 26 : la feuille flotte au-dessus du bas de l'écran (coins arrondis, marges), la zone de l'indicateur
      // d'accueil n'est pas sous elle. Android : la feuille touche le bord, sa safe area reste sous le contenu.
      insetAdjustment={FLOATING ? 'never' : 'automatic'}
      footer={
        footer ? (
          <View
            style={{
              paddingHorizontal: tokens.space[5],
              paddingTop: tokens.space[3],
              // Même marge que sur les côtés ; sur Android, TrueSheet ajoute la safe area basse en dessous.
              paddingBottom: tokens.space[5],
              backgroundColor: colors.surface,
            }}
          >
            {footer}
          </View>
        ) : undefined
      }
      onDidPresent={onDidPresent}
      onDidDismiss={() => {
        // Balayage, voile ou retour : l'appelant repasse `open` à false.
        if (presented.current) {
          presented.current = false
          onClose()
        }
        onDismissed?.()
      }}
    >
      <Animated.ScrollView
        ref={scroller}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flexGrow: 0, flexShrink: 1 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={stickyHeader ? [0] : undefined}
        contentContainerStyle={{
          paddingHorizontal: tokens.space[5],
          paddingBottom: footer ? tokens.space[3] : tokens.space[5] + (FLOATING ? 0 : insets.bottom),
        }}
      >
        {stickyHeader ? (
          // `sticky top-0 bg-jo-surface pb-1` du lab ; l'espace sous la zone reprend le `gap-3` du contenu.
          <View style={{ backgroundColor: colors.surface, paddingBottom: tokens.space[4] }}>{stickyHeader}</View>
        ) : null}
        {children}
      </Animated.ScrollView>
      {/* Grande feuille = liste paginée (joueurs, commentaires) : « Haut de page » comme dans les écrans. */}
      {tall && <ScrollToTopPill scroll={offset} top={tokens.space[3]} onPress={() => scroller.current?.scrollTo({ y: 0, animated: true })} />}
    </TrueSheet>
  )
}
