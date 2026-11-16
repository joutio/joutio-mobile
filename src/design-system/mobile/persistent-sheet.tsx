import { TrueSheet, type DetentInfoEventPayload } from '@lodev09/react-native-true-sheet'
import { useEffect, useRef, type ReactNode } from 'react'
import { Platform, ScrollView, useWindowDimensions, View, type ScrollViewInstance } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { useT } from '@/lib/i18n'

export type Detent = 'peek' | 'half' | 'full'

const ORDER: readonly Detent[] = ['peek', 'half', 'full']
/** Crans `half` et `full`, en fraction de la hauteur disponible (lab : 58 % et 94 %). */
const DETENTS = ['peek', 0.58, 0.94] as const
/** iOS 26 : feuille flottante, sans safe area basse sous son contenu (même règle que `MobileSheet`). */
const FLOATING = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26

export interface PersistentSheetProps {
  /** Nom accessible de la feuille. */
  label: string
  detent: Detent
  onDetentChange: (detent: Detent) => void
  /** Toujours visible sous la poignée : le résumé lisible au cran `peek`. */
  header: ReactNode
  /** Actions épinglées en bas, quel que soit le cran. */
  footer?: ReactNode
  /** Hauteur du cran `peek` (poignée, résumé, pied) : l'écran réserve cette place sous son contenu. */
  onPeekHeight?: (height: number) => void
  /** Figée au `peek`, sans poignée : rien à déplier. */
  locked?: boolean
  children?: ReactNode
}

/**
 * Feuille **persistante** à crans (`navigation.md`), native sur chaque plateforme (TrueSheet : `UISheetPresentationController`
 * sur iOS, `BottomSheetBehavior` Material sur Android) : présentée au montage, jamais fermable par le geste, sans voile,
 * l'écran dessous reste utilisable (retour, pager). Le cran `peek` montre exactement la poignée, l'en-tête et le pied
 * (détente native `peek`) ; `half` et `full` suivent la hauteur disponible. La navigation est gérée par TrueSheet : la
 * feuille s'efface quand l'écran est recouvert ou quitté et revient avec lui ; sur Android, le retour matériel passe à
 * la navigation.
 */
export function PersistentSheet({ label, detent, onDetentChange, header, footer, onPeekHeight, locked = false, children }: PersistentSheetProps) {
  const t = useT()
  const { colors, radius } = useTheme()
  const { height } = useWindowDimensions()
  const sheet = useRef<TrueSheet>(null)
  const scroller = useRef<ScrollViewInstance>(null)
  const shown: Detent = locked ? 'peek' : detent
  const index = ORDER.indexOf(shown)
  // Cran natif courant : un changement venu de l'écran (question suivante) redimensionne, un geste ne fait que le signaler.
  const native = useRef(index)

  useEffect(() => {
    if (native.current === index) return
    native.current = index
    sheet.current?.resize(index).catch(() => undefined)
  }, [index])

  const settle = ({ index: next, position }: DetentInfoEventPayload) => {
    native.current = next
    if (next === 0) onPeekHeight?.(Math.max(0, height - position))
    const value = ORDER[next]
    if (value && value !== shown) onDetentChange(value)
  }

  return (
    <TrueSheet
      ref={sheet}
      detents={locked ? ['peek'] : [...DETENTS]}
      initialDetentIndex={index}
      initialDetentAnimated={false}
      dismissible={false}
      dimmed={false}
      // Android : le retour matériel revient à l'écran précédent (la feuille suit la navigation).
      onBackPress={() => false}
      cornerRadius={radius.xl}
      backgroundColor={colors.surface}
      grabber={!locked}
      grabberOptions={{ color: colors.border }}
      accessibilityOptions={{
        paneTitle: label,
        grabberLabel: t('mobile.ds.detentHeight', { label }),
        collapsedValue: t('mobile.ds.detentPeek'),
        detentValue: t('mobile.ds.detentHalf'),
        expandedValue: t('mobile.ds.detentFull'),
      }}
      scrollableRef={scroller}
      insetAdjustment={FLOATING ? 'never' : 'automatic'}
      header={
        <View style={{ paddingHorizontal: tokens.space[5], paddingTop: locked ? tokens.space[4] : tokens.space[5], paddingBottom: tokens.space[3] }}>
          {header}
        </View>
      }
      footerOptions={footer ? { position: 'absolute' } : undefined}
      footerStyle={footer ? { backgroundColor: colors.surface } : undefined}
      footer={
        footer ? (
          <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: tokens.space[5], backgroundColor: colors.surface }}>
            {footer}
          </View>
        ) : undefined
      }
      onDidPresent={(event) => settle(event.nativeEvent)}
      onDetentChange={(event) => settle(event.nativeEvent)}
    >
      <ScrollView
        ref={scroller}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[1], paddingBottom: tokens.space[4] }}
      >
        {children}
      </ScrollView>
    </TrueSheet>
  )
}
