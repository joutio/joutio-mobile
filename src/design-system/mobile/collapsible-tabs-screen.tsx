import { Image } from 'expo-image'
import type { ReactNode, Ref } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Tabs,
  useHeaderMeasurements,
  useHeaderScrollY,
  type CollapsingTabsRef,
  type TabBarRenderProps,
  type TabChangeEvent,
} from 'react-native-collapsible-tab'
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated'
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

/**
 * Listes d'un onglet : à utiliser **directement** comme contenu de `tabs[].content`. Chacune est virtualisée et
 * synchronisée avec l'en-tête (`react-native-collapsible-tab`).
 */
export const TabList = Tabs.FlatList
export const TabSectionList = Tabs.SectionList
export const TabScrollView = Tabs.ScrollView

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
  tabsRef?: Ref<CollapsingTabsRef>
}

/** Image en parallaxe, titre qui s'efface, barre compacte épinglée. Rendu dans l'en-tête repliable. */
function Header({ image, title, eyebrow, centered, back = true, onBack, right, intro }: Omit<CollapsibleTabsScreenProps<string>, 'tabs' | 'tabsLabel'>) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const scroll = useHeaderScrollY()
  const { top } = useHeaderMeasurements()

  const barHeight = insets.top + TOP_BAR_HEIGHT
  // Courbes partagées avec ParallaxScreen (Parallax Header de Reacticx).
  // Position du titre dans l'image, mesurée : la barre prend le relais au moment exact où il passe dessous.
  const titleStart = useSharedValue(HERO_HEIGHT - barHeight)
  const titleLength = useSharedValue(56)
  const progress = useDerivedValue(() => compactBarProgress(scroll.value, titleStart.value, titleLength.value))
  const imageStyle = useAnimatedStyle(() => ({ transform: heroImageTransform(scroll.value, reduced) }))
  const titleStyle = useAnimatedStyle(() => ({ opacity: heroTitleOpacity(scroll.value, titleStart.value, titleLength.value) }))
  // La barre compense la translation de l'en-tête : elle reste en haut de l'écran.
  const pinned = useAnimatedStyle(() => ({ transform: [{ translateY: -top.value }] }))
  const opaque = useAnimatedStyle(() => ({ opacity: progress.value }))

  return (
    <View>
      <View
        style={{ height: HERO_HEIGHT, overflow: 'hidden', backgroundColor: colors.surface }}
        accessible
        accessibilityRole="header"
        accessibilityLabel={title}
      >
        {image !== undefined && (
          <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
            <Image source={image} contentFit="cover" style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
        <View
          style={[StyleSheet.absoluteFill, { experimental_backgroundImage: `linear-gradient(to top, ${colors.bg}, ${alpha(colors.bg, 0.4)}, transparent)` }]}
        />
        {/* La barre d'état reste lisible sur n'importe quelle image. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 112,
            experimental_backgroundImage: `linear-gradient(to bottom, ${alpha(colors.bg, 0.8)}, transparent)`,
          }}
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
      {intro && <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[3] }}>{intro}</View>}

      <ParallaxProgressProvider progress={progress}>
        <Animated.View
          pointerEvents="box-none"
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + TOP_BAR_HEIGHT, zIndex: 10 }, pinned]}
        >
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, borderBottomWidth: HAIRLINE, borderBottomColor: colors.border }, opaque]}
          />
          <CompactBarRow title={title} back={back} onBack={onBack} right={right} titleStyle={opaque} />
        </Animated.View>
      </ParallaxProgressProvider>
    </View>
  )
}

/**
 * Écran à en-tête image **avec onglets** (Fiche sujet, Profil, Fiche joueur) : l'en-tête se replie en barre compacte,
 * les onglets restent collés dessous, chaque onglet a sa propre liste virtualisée et garde sa position.
 * Onglets montés à la demande ; balayage entre onglets ; l'indicateur suit le doigt.
 */
export function CollapsibleTabsScreen<T extends string>({
  tabs,
  tabsLabel,
  initialTab,
  onTabChange,
  floating,
  tabsRef,
  ...header
}: CollapsibleTabsScreenProps<T>) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const renderTabBar = ({ tabNames, activeIndex, indexDecimal, onTabPress }: TabBarRenderProps) => (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: tokens.space[4] }}>
      <Segmented
        scrollable
        label={tabsLabel}
        options={tabs}
        value={(tabNames[activeIndex] ?? tabs[0]?.value ?? '') as T}
        position={indexDecimal}
        onChange={onTabPress}
      />
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs.Container
        ref={tabsRef}
        renderHeader={() => <Header {...header} />}
        renderTabBar={renderTabBar}
        minHeaderHeight={insets.top + TOP_BAR_HEIGHT}
        headerBackgroundColor={colors.bg}
        initialTabName={initialTab}
        onTabChange={(event: TabChangeEvent) => onTabChange?.(event.tabName as T)}
        lazy
      >
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.value} name={tab.value} label={tab.label}>
            {tab.content}
          </Tabs.Tab>
        ))}
      </Tabs.Container>
      {floating && <View style={{ position: 'absolute', right: tokens.space[5], bottom: tokens.space[5] + insets.bottom }}>{floating}</View>}
    </View>
  )
}
