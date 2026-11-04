import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { ScrollView, useWindowDimensions, View, type ScrollViewInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useModalFocus, type ViewRef } from '../a11y'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
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
  /** Rend le focus à l'élément qui a ouvert la feuille. */
  returnFocusTo?: RefObject<ViewRef | null>
  children: ReactNode
}

/** `rgba(r,g,b,a)` → couleur opaque et opacité, pour le voile natif. */
const splitScrim = (scrim: string) => {
  const [r = 0, g = 0, b = 0, a = 1] = scrim.match(/[\d.]+/g)?.map(Number) ?? []
  return { color: `rgb(${r},${g},${b})`, opacity: a }
}

/**
 * Feuille modale par le bas, native (TrueSheet). Ajustée au contenu jusqu'à 80 %, ou `tall` à 92 %.
 * Contenu démonté une fois fermée. Une étape suivante s'empile dans une nouvelle feuille (`foundations.md` § 11).
 */
export function MobileSheet({ open, onClose, title, subtitle, onBack, action, tall = false, footer, returnFocusTo, children }: MobileSheetProps) {
  const { colors, radius } = useTheme()
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const sheet = useRef<TrueSheet>(null)
  const scroller = useRef<ScrollViewInstance>(null)
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
      header={<SheetHeader title={title} subtitle={subtitle} onBack={onBack} action={action} onClose={onClose} titleRef={titleRef} handle={false} />}
      footer={
        footer ? (
          <View
            style={{
              paddingHorizontal: tokens.space[5],
              paddingTop: tokens.space[3],
              paddingBottom: tokens.space[5] + insets.bottom,
              backgroundColor: colors.surface,
            }}
          >
            {footer}
          </View>
        ) : undefined
      }
      onDidDismiss={() => {
        // Balayage, voile ou retour : l'appelant repasse `open` à false.
        if (presented.current) {
          presented.current = false
          onClose()
        }
      }}
    >
      <ScrollView
        ref={scroller}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: tokens.space[5], paddingBottom: footer ? tokens.space[3] : tokens.space[5] + insets.bottom }}
      >
        {children}
      </ScrollView>
    </TrueSheet>
  )
}
