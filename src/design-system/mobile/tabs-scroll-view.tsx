import { StickyHeaderContext } from './sticky-header'
import { useContext, useEffect, useCallback, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { View } from 'react-native'
import { CollapsibleTabView, type CollapsibleTabsRef, type Route } from 'react-native-collapsible-tabs-native'
import { useAnimatedReaction, useDerivedValue, useEvent, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { JoutioTabs } from '../primitives/joutio-tabs'
import { headerSeparators } from './header-geometry'
import { HeaderSeparator } from './header-separator'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { ScrollEdgeContext } from './scroll-edge'
import { HorizontalGestureContext } from './horizontal-gesture'
import { usePageRefresh } from './page-refresh'
import { ScrollToTopPill } from './scroll-to-top-pill'
import { TabPageActiveContext } from './tab-page'

export interface TabsScrollPage<T extends string> {
  value: T
  label: string
  /** `TabScrollView`, `TabList` ou `TabSectionList` (décalés sous l'en-tête). */
  content: ReactNode
}

export interface TabsScrollViewProps<T extends string> {
  /** Défile et se replie au-dessus des onglets (bonjour, statut). */
  header?: ReactNode
  pages: readonly TabsScrollPage<T>[]
  /** Nom accessible de la barre d'onglets. */
  label: string
  value: T
  onChange: (value: T) => void
  /** Vrai une fois l'en-tête replié et les onglets collés (titre compact dans la barre de l'écran). */
  onStuckChange?: (stuck: boolean) => void
  /** `false` : la barre d'onglets défile avec l'en-tête au lieu de se coller en haut. */
  pinned?: boolean
  tabsRef?: Ref<CollapsibleTabsRef>
  /** Reçoit le défilement de la page active (négatif au tiré), sur le thread UI : animations liées au repli. */
  scroll?: SharedValue<number>
  /** Tiré vers le bas en haut de page : recharge toute la page. Le spinner reste jusqu'à la fin de la promesse. */
  onRefresh?: () => Promise<unknown> | void
  /** Pastille « Haut de page » sous les onglets collés (`ScrollToTopPill`). Active par défaut. */
  scrollToTopPill?: boolean
  /** Onglets trop nombreux pour la largeur : la barre défile et suit la page (éditeur d'avatar). */
  scrollableTabs?: boolean
}
/**
 * Onglets à balayer (`TabsScrollView` du lab) : `JoutioTabs` collé sous la barre de l'écran, contenu qu'on balaie d'un
 * onglet à l'autre, chaque page avec son propre défilement. Repli de l'en-tête natif (même moteur que
 * `CollapsibleTabsScreen`) ; l'indicateur suit le doigt.
 */
export function TabsScrollView<T extends string>({
  header,
  pages,
  label,
  value,
  onChange,
  onStuckChange,
  pinned = true,
  tabsRef,
  scroll,
  onRefresh,
  scrollToTopPill = true,
  scrollableTabs = false,
}: TabsScrollViewProps<T>) {
  const { colors } = useTheme()
  const refresh = usePageRefresh(onRefresh)
  const headerGeometry = refresh.header
  // Le pager est arbitré nativement par la lib (un rail enfant possède le geste horizontal, y compris incliné ou en
  // bout de liste). Ce contexte ne sert qu'au `DragToLoadMore`, pour qu'il ne vole pas le geste du rail.
  const owned = useSharedValue(false)
  const claim = useCallback(() => {
    owned.value = true
  }, [owned])
  const release = useCallback(() => {
    owned.value = false
  }, [owned])
  const horizontalGesture = useMemo(() => ({ owned, claim, release }), [owned, claim, release])
  const index = Math.max(
    0,
    pages.findIndex((page) => page.value === value),
  )
  const routes: Route[] = pages.map((page) => ({ key: page.value, title: page.label }))
  const headerSticky = useContext(StickyHeaderContext)
  useEffect(
    () => () => {
      if (headerSticky) {
        headerSticky.docking.value = 0
        headerSticky.offset.value = 0
      }
    },
    [headerSticky],
  )
  const [headerHeight, setHeaderHeight] = useState(0)
  const [tabBarHeight, setTabBarHeight] = useState(0)
  const inner = useRef<CollapsibleTabsRef>(null)
  useImperativeHandle(tabsRef, () => ({
    scrollToTop: (options) => inner.current?.scrollToTop(options),
    setIndex: (next, options) => inner.current?.setIndex(next, options),
    collapse: (options) => inner.current?.collapse(options),
    expand: (options) => inner.current?.expand(options),
  }))
  const ownScroll = useSharedValue(0)
  const offset = scroll ?? ownScroll
  const separators = useDerivedValue(() => headerSeparators(headerGeometry.value, offset.value, pinned))
  const bottomSeparator = useDerivedValue(() => separators.value.bottom)
  useAnimatedReaction(
    () => separators.value,
    (value) => {
      if (headerSticky) {
        headerSticky.docking.value = value.docking
        headerSticky.offset.value = value.offset
      }
    },
  )
  const position = useSharedValue(index)
  const onPageScroll = useEvent<{ position: number; offset: number }>(
    (event) => {
      'worklet'
      position.value = event.position + event.offset
    },
    ['topPageScroll', 'onPageScroll'],
  )
  const onScrollOffsetChange = useEvent<{ offset: number }>(
    (event) => {
      'worklet'
      offset.value = event.offset
    },
    ['topScrollOffsetChange', 'onScrollOffsetChange'],
  )

  return (
    <HorizontalGestureContext.Provider value={horizontalGesture}>
      <ScrollEdgeContext.Provider value={null}>
        <View style={{ flex: 1 }}>
          <CollapsibleTabView
            ref={inner}
            navigationState={{ index, routes }}
            onIndexChange={(next) => {
              const page = pages[next]
              if (page) onChange(page.value)
            }}
            renderScene={({ route }) => (
              <TabPageActiveContext.Provider value={route.key === value}>
                {pages.find((page) => page.value === route.key)?.content ?? null}
              </TabPageActiveContext.Provider>
            )}
            renderHeader={() => (
              <View style={{ backgroundColor: colors.bg }} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
                {header}
              </View>
            )}
            renderTabBar={() => (
              <View
                // Déborde d'1 pt sur l'en-tête (dessinée après lui) : la hauteur fractionnaire de l'en-tête laisse sinon une
                // rangée de pixels transparente entre les deux, par où la page transparaît sous les onglets collés.
                style={{
                  backgroundColor: colors.bg,
                  marginTop: -1,
                  paddingHorizontal: tokens.space[5],
                  paddingTop: tokens.space[3] + 1,
                  paddingBottom: tokens.space[3],
                }}
                onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}
              >
                <JoutioTabs label={label} options={pages} value={value} position={position} scrollable={scrollableTabs} onChange={onChange} />
                <HeaderSeparator progress={bottomSeparator} />
              </View>
            )}
            // Collés dès que l'en-tête est entièrement replié.
            collapseThreshold={Math.max(1, headerHeight - 1)}
            onCollapsedChange={onStuckChange}
            pinTabBar={pinned}
            onPageScroll={onPageScroll}
            onScrollOffsetChange={onScrollOffsetChange}
            {...refresh.tabProps}
            lazy
          />
          {scrollToTopPill && pinned && (
            <ScrollToTopPill scroll={offset} top={tabBarHeight + tokens.space[2]} onPress={() => inner.current?.scrollToTop({ animated: true })} />
          )}
        </View>
      </ScrollEdgeContext.Provider>
    </HorizontalGestureContext.Provider>
  )
}
