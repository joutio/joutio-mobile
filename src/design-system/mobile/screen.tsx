import { useContext, useState, type ReactNode, type Ref } from 'react'
import { RefreshControl, ScrollView, View, type ScrollViewInstance, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native'
import { HeaderHeightContext } from 'expo-router/react-navigation'
import { Platform } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { DragToLoadMore, LoadMoreScrollView } from './drag-to-load-more'
import { ScrollRefreshHost, withScrollRefreshFeedback } from './scroll-refresh'

/** Liste paginée de l'écran : la suite se charge en tirant en bas (`DragToLoadMore`, `contenu.md`). */
/** Marge entre le champ actif et le haut du clavier. */
const KEYBOARD_GAP = 24
const RefreshScrollView = withScrollRefreshFeedback(ScrollView)
const RefreshKeyboardAwareScrollView = withScrollRefreshFeedback(KeyboardAwareScrollView)

export interface LoadMoreOptions {
  /** Une page suivante existe (et la précédente n'a pas échoué). */
  enabled: boolean
  loading?: boolean
  resetKey?: unknown
  onLoadMore: () => unknown
}

export interface ScreenProps {
  header?: ReactNode
  /**
   * En-tête natif (`nativeHeaderOptions`) : pas de safe area haute ici ; le défilement passe sous l'en-tête
   * translucide iOS et pilote le repli du grand titre.
   */
  nativeHeader?: boolean
  /** Barre fixe au-dessus de la bottom nav : action, ligne du joueur, etc. */
  bottomBar?: ReactNode
  /** Écran racine d'un onglet : la barre d'onglets porte déjà la safe area basse. */
  inTabs?: boolean
  /** Feuilles, dialogs et toasts. */
  overlay?: ReactNode
  /**
   * `true` (défaut) : le contenu défile dans un ScrollView. `false` : l'écran fournit sa liste
   * (FlatList, SectionList) qui remplit la place.
   */
  scroll?: boolean
  scrollProps?: Omit<ScrollViewProps, 'children'>
  scrollRef?: Ref<ScrollViewInstance>
  /** Tirer pour rafraîchir : l'indicateur reste affiché jusqu'à la fin de la promesse. */
  onRefresh?: () => Promise<unknown> | void
  /** Pagination au geste sur le défilement de l'écran (hors en-tête natif). */
  loadMore?: LoadMoreOptions
  contentStyle?: StyleProp<ViewStyle>
  children: ReactNode
}

/**
 * Structure d'un écran : header fixe sous la safe area haute, contenu qui défile (seule zone mobile),
 * barre basse facultative, safe area basse si l'écran n'est pas dans les onglets.
 */
export function Screen({
  header,
  nativeHeader = false,
  bottomBar,
  inTabs = false,
  overlay,
  scroll = true,
  scrollProps,
  scrollRef,
  loadMore,
  onRefresh,
  contentStyle,
  children,
}: ScreenProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const headerHeight = useContext(HeaderHeightContext) ?? 0
  // iOS : l'en-tête natif est translucide et posé sur le contenu ; un contenu fixe doit le contourner.
  const underHeader = nativeHeader && Platform.OS === 'ios'
  const bottom = inTabs || bottomBar ? 0 : insets.bottom
  const [refreshing, setRefreshing] = useState(false)
  const [ownHeaderHeight, setOwnHeaderHeight] = useState(0)
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      tintColor={colors.muted}
      colors={[colors.accentInk]}
      progressBackgroundColor={colors.surface}
      onRefresh={() => {
        setRefreshing(true)
        Promise.resolve()
          .then(onRefresh)
          .catch(() => undefined)
          .finally(() => setRefreshing(false))
      }}
    />
  ) : undefined

  // Champ touché toujours visible au-dessus du clavier (2026-11-07) : le défilement d'un écran suit le clavier
  // (keyboard-controller). Une liste paginée garde son défilement (`LoadMoreScrollView`) : ses champs sont en tête.
  // En-tête natif iOS : un ScrollView simple, premier enfant de l'écran (repli du grand titre).
  const Scroller = nativeHeader ? RefreshScrollView : loadMore ? LoadMoreScrollView : RefreshKeyboardAwareScrollView
  const keyboardProps = Scroller === RefreshKeyboardAwareScrollView ? { bottomOffset: KEYBOARD_GAP, keyboardShouldPersistTaps: 'handled' as const } : {}
  const list = (
    <Scroller
      // Le ref de keyboard-controller étend celui d'un ScrollView (scrollTo, scrollToEnd…).
      ref={scrollRef as Ref<never>}
      {...keyboardProps}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={underHeader ? 'automatic' : 'never'}
      refreshControl={refreshControl}
      {...scrollProps}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ paddingBottom: bottom }, contentStyle]}
    >
      {children}
    </Scroller>
  )
  const scroller =
    loadMore && !nativeHeader ? (
      <DragToLoadMore resetKey={loadMore.resetKey} enabled={loadMore.enabled} loading={loadMore.loading} onLoadMore={loadMore.onLoadMore}>
        {list}
      </DragToLoadMore>
    ) : (
      list
    )
  const extras = (
    <>
      {bottomBar && <View style={{ paddingBottom: inTabs ? 0 : insets.bottom, backgroundColor: colors.bg }}>{bottomBar}</View>}
      {overlay}
    </>
  )

  // En-tête natif iOS : le ScrollView doit être le **premier enfant** de l'écran, sinon l'en-tête ne le trouve pas
  // (grand titre qui ne se replie pas, pas d'effet de bord de défilement).
  if (nativeHeader && scroll) {
    return (
      <ScrollRefreshHost top={headerHeight + tokens.space[4]}>
        {scroller}
        {extras}
      </ScrollRefreshHost>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollRefreshHost top={ownHeaderHeight + tokens.space[4]}>
        {!nativeHeader && (
          <View onLayout={(event) => setOwnHeaderHeight(event.nativeEvent.layout.height)} style={{ paddingTop: insets.top }}>
            {header}
          </View>
        )}
        {scroll ? scroller : <View style={[{ flex: 1, paddingTop: underHeader ? headerHeight : 0, paddingBottom: bottom }, contentStyle]}>{children}</View>}
        {extras}
      </ScrollRefreshHost>
    </View>
  )
}
