import { useState, type ReactNode, type Ref } from 'react'
import { View } from 'react-native'
import { CollapsibleTabView, type CollapsibleTabsRef, type Route } from 'react-native-collapsible-tabs-native'
import { useEvent, useSharedValue } from 'react-native-reanimated'
import { Segmented } from '../primitives/segmented'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

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
  tabsRef?: Ref<CollapsibleTabsRef>
}

/**
 * Onglets à balayer (`TabsScrollView` du lab) : `Segmented` collé sous la barre de l'écran, contenu qu'on balaie d'un
 * onglet à l'autre, chaque page avec son propre défilement. Repli de l'en-tête natif (même moteur que
 * `CollapsibleTabsScreen`) ; l'indicateur suit le doigt.
 */
export function TabsScrollView<T extends string>({ header, pages, label, value, onChange, onStuckChange, tabsRef }: TabsScrollViewProps<T>) {
  const { colors } = useTheme()
  const index = Math.max(
    0,
    pages.findIndex((page) => page.value === value),
  )
  const routes: Route[] = pages.map((page) => ({ key: page.value, title: page.label }))
  const [headerHeight, setHeaderHeight] = useState(0)
  const position = useSharedValue(index)
  const onPageScroll = useEvent<{ position: number; offset: number }>(
    (event) => {
      'worklet'
      position.value = event.position + event.offset
    },
    ['topPageScroll', 'onPageScroll'],
  )

  return (
    <CollapsibleTabView
      ref={tabsRef}
      navigationState={{ index, routes }}
      onIndexChange={(next) => {
        const page = pages[next]
        if (page) onChange(page.value)
      }}
      renderScene={({ route }) => pages.find((page) => page.value === route.key)?.content ?? null}
      renderHeader={() => (
        <View style={{ backgroundColor: colors.bg }} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
          {header}
        </View>
      )}
      renderTabBar={() => (
        <View style={{ backgroundColor: colors.bg, paddingHorizontal: tokens.space[5], paddingVertical: tokens.space[3] }}>
          <Segmented label={label} options={pages} value={value} position={position} onChange={onChange} />
        </View>
      )}
      // Collés dès que l'en-tête est entièrement replié.
      collapseThreshold={Math.max(1, headerHeight - 1)}
      onCollapsedChange={onStuckChange}
      onPageScroll={onPageScroll}
      lazy
    />
  )
}
