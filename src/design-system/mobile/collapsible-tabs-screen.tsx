import { Image } from 'expo-image'
import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'
import { SectionList, StyleSheet, View } from 'react-native'
import {
  CollapsibleTabView,
  createTabList,
  TabFlatList,
  TabScrollView as NativeTabScrollView,
  type CollapsibleTabsRef,
  type Route,
} from 'react-native-collapsible-tabs-native'
import Animated, { useAnimatedStyle, useDerivedValue, useEvent, useSharedValue, type SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useReducedMotion } from '../motion'
import { Segmented } from '../primitives/segmented'
import { Text } from '../primitives/text'
import { alpha } from '../theme/color'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { TOP_BAR_HEIGHT } from './mobile-top-bar'
import { CompactBarRow, compactBarProgress, HERO_HEIGHT, heroImageTransform, heroTitleOpacity, ParallaxProgressProvider } from './parallax-screen'

export type { CollapsibleTabsRef }

/**
 * Listes d'un onglet : à utiliser **directement** comme contenu de `tabs[].content`. Chacune est virtualisée et
 * décalée sous l'en-tête (`react-native-collapsible-tabs-native`, qui replie l'en-tête en natif).
 */
export const TabList = TabFlatList
export const TabSectionList = createTabList(SectionList) as typeof SectionList
export const TabScrollView = NativeTabScrollView

export interface CollapsibleTab<T extends string> {
  value: T
  label: string
  /** `TabList`, `TabSectionList` ou `TabScrollView`. */
  content: ReactNode
}

export interface CollapsibleTabsScreenProps<T extends string> {
  /** Absente : fond uni, pour une bannière facultative. */
  image?: string | number
  title: string
  /** Au-dessus du titre, par exemple la catégorie. */
  eyebrow?: ReactNode
  /** Titre centré sur l'image, pour une identité plutôt qu'un sujet. */
  centered?: boolean
  /** `false` sur un onglet, qui n'a pas d'écran précédent. */
  back?: boolean
  onBack?: () => void
  /** Actions de droite (`ParallaxIconButton`), visibles sur l'image comme sur la barre. */
  right?: ReactNode
  /** Sous l'image : défile avec elle (statistiques, actions principales). */
  intro?: ReactNode
  tabs: readonly CollapsibleTab<T>[]
  /** Nom accessible de la barre d'onglets. */
  tabsLabel: string
  initialTab?: T
  onTabChange?: (value: T) => void
  /** Bouton flottant, en bas à droite. */
  floating?: ReactNode
  tabsRef?: Ref<CollapsibleTabsRef>
}

interface HeroProps {
  image?: string | number
  title: string
  eyebrow?: ReactNode
  centered?: boolean
  intro?: ReactNode
  /** Défilement de la liste active (négatif au tiré), lu sur le thread UI. */
  scroll: SharedValue<number>
  /** Début et durée du passage du titre sous la barre compacte, mesurés. */
  titleStart: SharedValue<number>
  titleLength: SharedValue<number>
  barHeight: number
}

/** Image en parallaxe et titre qui s'efface : l'en-tête que le natif replie. */
function Hero({ image, title, eyebrow, centered, intro, scroll, titleStart, titleLength, barHeight }: HeroProps) {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  const imageStyle = useAnimatedStyle(() => ({ transform: heroImageTransform(scroll.value, reduced) }))
  const titleStyle = useAnimatedStyle(() => ({ opacity: heroTitleOpacity(scroll.value, titleStart.value, titleLength.value) }))

  return (
    <View style={{ backgroundColor: colors.bg }}>
      {/* Découpe qui déborde vers le haut (comme ParallaxScreen) : au tiré, le natif descend l'en-tête et l'image
          zoomée couvre l'espace libéré au-dessus, au lieu d'être coupée au bord de la bannière. */}
      <View style={{ marginTop: -HERO_HEIGHT * 4, paddingTop: HERO_HEIGHT * 4, overflow: 'hidden' }}>
        <View style={{ height: HERO_HEIGHT, backgroundColor: colors.surface }} accessible accessibilityRole="header" accessibilityLabel={title}>
          {image !== undefined && (
            <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
              <Image source={image} contentFit="cover" style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}
          <View
            style={[StyleSheet.absoluteFill, { experimental_backgroundImage: `linear-gradient(to top, ${colors.bg}, ${alpha(colors.bg, 0.4)}, transparent)` }]}
          />
          <Animated.View
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout
              titleStart.value = y - barHeight
              titleLength.value = height
            }}
            style={[
              {
                position: 'absolute',
                left: tokens.space[5],
                right: tokens.space[5],
                bottom: tokens.space[4],
                gap: tokens.space[2],
                alignItems: centered ? 'center' : 'flex-start',
              },
              titleStyle,
            ]}
          >
            {eyebrow}
            <Text variant="title1" align={centered ? 'center' : 'left'}>
              {title}
            </Text>
          </Animated.View>
        </View>
      </View>
      {intro && <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[3] }}>{intro}</View>}
    </View>
  )
}

/**
 * Écran à en-tête image **avec onglets** (Fiche sujet, Profil, Fiche joueur) : l'en-tête se replie en barre
 * compacte, les onglets restent collés dessous, chaque onglet a sa propre liste virtualisée et garde sa position.
 *
 * Le repli est **natif** (UIKit / ViewPager2) : l'en-tête et la liste bougent dans la même frame. Reanimated ne
 * pilote que ce qui vit dans l'en-tête (parallaxe, fondu du titre) et la barre compacte, posée par-dessus : elle ne
 * fait que s'opacifier, sans jamais compenser une translation. Onglets montés à la demande ; balayage entre onglets ;
 * l'indicateur suit le doigt ; toucher l'onglet actif remonte sa liste en haut.
 */
export function CollapsibleTabsScreen<T extends string>({
  tabs,
  tabsLabel,
  initialTab,
  onTabChange,
  floating,
  tabsRef,
  title,
  back = true,
  onBack,
  right,
  ...hero
}: CollapsibleTabsScreenProps<T>) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const barHeight = insets.top + TOP_BAR_HEIGHT

  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      tabs.findIndex((tab) => tab.value === initialTab),
    ),
  )
  const routes: Route[] = tabs.map((tab) => ({ key: tab.value, title: tab.label }))
  const inner = useRef<CollapsibleTabsRef>(null)
  useImperativeHandle(tabsRef, () => ({
    scrollToTop: (options) => inner.current?.scrollToTop(options),
    setIndex: (value, options) => inner.current?.setIndex(value, options),
    collapse: (options) => inner.current?.collapse(options),
    expand: (options) => inner.current?.expand(options),
  }))

  // Défilement de la liste active et position du pager, lus depuis le callback natif, sur le thread UI.
  const scroll = useSharedValue(0)
  const position = useSharedValue(index)
  const onScrollOffsetChange = useEvent<{ offset: number }>(
    (event) => {
      'worklet'
      scroll.value = event.offset
    },
    ['topScrollOffsetChange', 'onScrollOffsetChange'],
  )
  const onPageScroll = useEvent<{ position: number; offset: number }>(
    (event) => {
      'worklet'
      position.value = event.position + event.offset
    },
    ['topPageScroll', 'onPageScroll'],
  )

  // Courbes partagées avec ParallaxScreen (Parallax Header de Reacticx). Position du titre dans l'image, mesurée :
  // la barre prend le relais au moment exact où il passe dessous.
  const titleStart = useSharedValue(HERO_HEIGHT - barHeight)
  const titleLength = useSharedValue(56)
  const progress = useDerivedValue(() => compactBarProgress(scroll.value, titleStart.value, titleLength.value))
  const opaque = useAnimatedStyle(() => ({ opacity: progress.value }))
  const statusScrim = useAnimatedStyle(() => ({ opacity: 1 - progress.value }))

  const changeIndex = (next: number) => {
    setIndex(next)
    const tab = tabs[next]
    if (tab) onTabChange?.(tab.value)
  }

  const renderTabBar = () => (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: tokens.space[4] }}>
      <Segmented
        scrollable
        label={tabsLabel}
        options={tabs}
        value={(tabs[index]?.value ?? tabs[0]?.value ?? '') as T}
        position={position}
        onChange={(value) => {
          const next = tabs.findIndex((tab) => tab.value === value)
          if (next < 0) return
          if (next === index) inner.current?.scrollToTop()
          else changeIndex(next)
        }}
      />
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CollapsibleTabView
        ref={inner}
        navigationState={{ index, routes }}
        onIndexChange={changeIndex}
        renderScene={({ route }) => tabs.find((tab) => tab.value === route.key)?.content ?? null}
        renderHeader={() => <Hero {...hero} title={title} scroll={scroll} titleStart={titleStart} titleLength={titleLength} barHeight={barHeight} />}
        renderTabBar={renderTabBar}
        // Le bas de l'en-tête reste sous la barre compacte, qui le recouvre : les onglets se collent sous elle.
        headerMinHeight={barHeight}
        onScrollOffsetChange={onScrollOffsetChange}
        onPageScroll={onPageScroll}
        lazy
      />

      {/* Lisibilité de la barre d'état : épinglé à l'écran (pas dans l'en-tête), il reste en place au tiré et s'efface
          quand la barre compacte devient opaque. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 112,
            experimental_backgroundImage: `linear-gradient(to bottom, ${alpha(colors.bg, 0.8)}, transparent)`,
          },
          statusScrim,
        ]}
      />

      {/* Barre compacte, hors de l'en-tête : fixe en haut de l'écran, elle s'opacifie quand le titre passe dessous. */}
      <ParallaxProgressProvider progress={progress}>
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: barHeight }}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, borderBottomWidth: HAIRLINE, borderBottomColor: colors.border }, opaque]}
          />
          <CompactBarRow title={title} back={back} onBack={onBack} right={right} titleStyle={opaque} />
        </View>
      </ParallaxProgressProvider>

      {floating && <View style={{ position: 'absolute', right: tokens.space[5], bottom: tokens.space[5] + insets.bottom }}>{floating}</View>}
    </View>
  )
}
