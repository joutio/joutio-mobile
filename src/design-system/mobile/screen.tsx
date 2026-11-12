import { ScrollEdgeContext } from './scroll-edge'
import { scrollEdgeProgress } from './header-geometry'
import { tabBarScrollInsets, withBottomInset } from './tab-bar-inset'
import { useContext, useMemo, type ReactNode, type Ref } from 'react'
import { RefreshControl, ScrollView, View, type ScrollViewInstance, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native'
import { HeaderHeightContext } from 'expo-router/react-navigation'
import { Platform } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StickyHeaderContext } from './sticky-header'
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { HeaderSeparator } from './header-separator'
import { useTheme } from '../theme/theme-provider'
import { DragToLoadMore, LoadMoreScrollView } from './drag-to-load-more'
import { useGuardedRefresh } from './guarded-refresh'

/** Liste paginée de l'écran : la suite se charge en tirant en bas (`DragToLoadMore`, `contenu.md`). */
/** Marge entre le champ actif et le haut du clavier. */
const KEYBOARD_GAP = 24
const RefreshScrollView = ScrollView
const RefreshKeyboardAwareScrollView = KeyboardAwareScrollView

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
  /** Position du défilement fourni par une liste externe (`scroll=false`). */
  scrollOffset?: SharedValue<number>
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
  scrollOffset,
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
  // Dans un onglet, seule la `JoTabBar` d'Android porte la zone sûre du bas ; la tab bar native iOS flotte sur le
  // contenu, qui garde la marge de la zone sûre de l'onglet (barre comprise).
  const tabBarOwnsBottom = inTabs && Platform.OS !== 'ios'
  // Sous la tab bar native : marge en `contentInset` (connue du natif : loader de fin de liste, indicateur) ;
  // ailleurs, un padding.
  const underTabBar = inTabs && Platform.OS === 'ios' && !bottomBar
  const bottom = tabBarOwnsBottom || bottomBar || underTabBar ? 0 : insets.bottom
  const stickyTabs = useSharedValue(0)
  const ownOffset = useSharedValue(0)
  const headerOffset = scrollOffset ?? ownOffset
  const headerContext = useMemo(() => ({ docking: stickyTabs, offset: headerOffset }), [stickyTabs, headerOffset])
  const separator = useDerivedValue(() => scrollEdgeProgress(headerOffset.value) * (1 - stickyTabs.value))
  const { refreshing, refresh } = useGuardedRefresh(onRefresh)
  const refreshControl = onRefresh ? (
    <RefreshControl refreshing={refreshing} tintColor={colors.muted} colors={[colors.accentInk]} progressBackgroundColor={colors.surface} onRefresh={refresh} />
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
      scrollEventThrottle={scrollProps?.scrollEventThrottle ?? 16}
      onScroll={(event) => {
        headerOffset.value = event.nativeEvent.contentOffset.y + event.nativeEvent.contentInset.top
        scrollProps?.onScroll?.(event)
      }}
      style={{ flex: 1, backgroundColor: colors.bg }}
      {...tabBarScrollInsets(underTabBar ? insets.bottom : 0)}
      contentContainerStyle={withBottomInset([{ paddingBottom: 0 }, contentStyle], bottom)}
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
      {bottomBar && <View style={{ paddingBottom: tabBarOwnsBottom ? 0 : insets.bottom, backgroundColor: colors.bg }}>{bottomBar}</View>}
      {overlay}
    </>
  )

  // En-tête natif iOS : le ScrollView doit être le **premier enfant** de l'écran, sinon l'en-tête ne le trouve pas
  // (grand titre qui ne se replie pas, pas d'effet de bord de défilement).
  if (nativeHeader && scroll) {
    return (
      <>
        {scroller}
        {extras}
      </>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StickyHeaderContext.Provider value={headerContext}>
        <ScrollEdgeContext.Provider value={headerOffset}>
          {!nativeHeader && (
            <View collapsable={false} style={{ paddingTop: insets.top, zIndex: 30, elevation: 1, shadowColor: 'transparent' }}>
              {header}
              {header && <HeaderSeparator progress={separator} />}
            </View>
          )}
          {/* Contenu qui défile lui-même : dans un onglet, il descend sous la tab bar (native iOS : effet verre) et finit
              lui-même au-dessus (`useTabBarInset`) ; aucune marge sur ce conteneur, qui couperait le contenu au bord de la barre. */}
          {scroll ? (
            scroller
          ) : (
            <View style={[{ flex: 1, paddingTop: underHeader ? headerHeight : 0, paddingBottom: inTabs ? 0 : bottom }, contentStyle]}>{children}</View>
          )}
          {extras}
        </ScrollEdgeContext.Provider>
      </StickyHeaderContext.Provider>
    </View>
  )
}
