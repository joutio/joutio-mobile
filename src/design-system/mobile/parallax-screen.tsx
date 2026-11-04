import { Image } from 'expo-image'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedRef,
  type AnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CaretLeftIcon, type Icon } from '../icons'
import { useReducedMotion } from '../motion'
import { PressableScale } from '../primitives/pressable-scale'
import { Text } from '../primitives/text'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { TOP_BAR_HEIGHT } from './mobile-top-bar'
import { HAIRLINE } from '../theme/hairline'

/** Hauteur de la zone image, safe area comprise (400 pt, décision du 2026-11-04 : effet du Parallax Header Reacticx). */
export const HERO_HEIGHT = 400

/*
 * Courbes du Parallax Header de Reacticx (rit3zh/glow-ui, MIT), reprises en Reanimated. `y` est le défilement :
 * négatif quand on tire vers le bas (rebond iOS), positif quand on défile.
 */

/** Image : zoom jusqu'à ×2,5 au tiré, parallaxe à mi-vitesse au défilement. Immobile sous mouvement réduit. */
export function heroImageTransform(y: number, reduced: boolean) {
  'worklet'
  if (reduced) return [{ translateY: 0 }, { scale: 1 }]
  const h = HERO_HEIGHT
  const down = interpolate(y, [-h, 0, h], [-h * 0.6, 0, h * 0.5], 'clamp')
  const up = interpolate(y, [-h, 0, h], [h * 0.3, 0, 0], 'clamp')
  const scale = interpolate(y, [-h, 0, h], [2.5, 1, 1], 'clamp')
  return [{ translateY: down + up }, { scale }]
}

/** Titre sur l'image : s'efface dès qu'on tire ou qu'on défile d'un tiers de l'image. */
export function heroTitleOpacity(y: number) {
  'worklet'
  const h = HERO_HEIGHT
  return interpolate(y, [-h * 0.3, 0, h * 0.3], [0, 1, 0], 'clamp')
}

/** Barre compacte : invisible jusqu'aux trois quarts du repli, opaque au repli complet. */
export function compactBarProgress(y: number, barHeight: number) {
  'worklet'
  const range = HERO_HEIGHT - barHeight
  return interpolate(y, [0, range * 0.75, range], [0, 0, 1], 'clamp')
}

interface ParallaxContextValue {
  /** 0 sur l'image, 1 une fois la barre compacte opaque. */
  progress: SharedValue<number>
}

const ParallaxContext = createContext<ParallaxContextValue | null>(null)

/** Fournit la progression du repli aux `ParallaxIconButton` (aussi utilisé par `CollapsibleTabsScreen`). */
export function ParallaxProgressProvider({ progress, children }: { progress: SharedValue<number>; children: ReactNode }) {
  const value = useMemo(() => ({ progress }), [progress])
  return <ParallaxContext.Provider value={value}>{children}</ParallaxContext.Provider>
}

export interface ParallaxIconButtonProps {
  icon: Icon
  label: string
  onPress?: () => void
}

/**
 * Bouton de `ParallaxScreen` : pastille sombre et icône blanche sur l'image, sans pastille et à la couleur du
 * thème sur la barre. À utiliser dans `right`.
 */
export function ParallaxIconButton({ icon: IconComponent, label, onPress }: ParallaxIconButtonProps) {
  const { colors, radius } = useTheme()
  const progress = useContext(ParallaxContext)?.progress
  // Calculées hors du worklet : `alpha` est une fonction JS.
  const scrim = tokens.color.dark.scrim
  const clear = alpha(scrim, 0)
  const background = useAnimatedStyle(() => {
    const amount = progress?.value ?? 0
    return { backgroundColor: interpolateColor(amount, [0, 1], [scrim, clear]) }
  })
  const onBar = useAnimatedStyle(() => ({ opacity: progress?.value ?? 0 }))
  const onImage = useAnimatedStyle(() => ({ opacity: 1 - (progress?.value ?? 0) }))

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} pressedScale={0.94} onPress={onPress}>
      <Animated.View style={[{ width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }, background]}>
        <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, onImage]}>
          <IconComponent size={22} color={tokens.color.dark.text} />
        </Animated.View>
        <Animated.View style={onBar}>
          <IconComponent size={22} color={colors.text} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  )
}

export interface CompactBarRowProps {
  title: string
  back?: boolean
  onBack?: () => void
  right?: ReactNode
  /** Titre à gauche, pour laisser la place à plusieurs actions. */
  titleStart?: boolean
  /** Opacité animée du titre (apparition de la barre). */
  titleStyle: AnimatedStyle<ViewStyle>
}

/**
 * Rangée de la barre compacte : retour, titre, actions. Le titre est **centré sur l'écran** (comme une barre
 * native), avec une marge égale à la plus large des deux zones d'actions, mesurées.
 */
export function CompactBarRow({ title, back = true, onBack, right, titleStart = false, titleStyle }: CompactBarRowProps) {
  const [sides, setSides] = useState({ left: 44, right: 0 })
  const inset = Math.max(sides.left, sides.right) + tokens.space[4] + tokens.space[3]
  const label = (
    <Text variant="headline" numberOfLines={1}>
      {title}
    </Text>
  )
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: TOP_BAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[3],
        paddingHorizontal: tokens.space[4],
      }}
    >
      <View onLayout={(event) => setSides((value) => ({ ...value, left: event.nativeEvent.layout.width }))} style={{ minWidth: 44, alignItems: 'flex-start' }}>
        {back && <ParallaxIconButton icon={CaretLeftIcon} label="Retour" onPress={onBack} />}
      </View>
      {titleStart ? (
        <Animated.View style={[{ flex: 1, minWidth: 0 }, titleStyle]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {label}
        </Animated.View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View
        onLayout={(event) => setSides((value) => ({ ...value, right: event.nativeEvent.layout.width }))}
        style={{ flexDirection: 'row', gap: tokens.space[3] }}
      >
        {right}
      </View>
      {!titleStart && (
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: inset }, titleStyle]}
        >
          {label}
        </Animated.View>
      )}
    </View>
  )
}

export interface ParallaxScreenProps {
  /** Absente : fond uni, pour une bannière facultative. */
  image?: string | number
  title: string
  /** Au-dessus du titre, par exemple la catégorie. */
  eyebrow?: ReactNode
  /** Titre centré sur l'image, pour une identité plutôt qu'un sujet. */
  centered?: boolean
  /** Titre de la barre compacte à gauche, pour laisser la place à plusieurs actions. */
  barTitleStart?: boolean
  /** `false` sur un onglet, qui n'a pas d'écran précédent. */
  back?: boolean
  onBack?: () => void
  /** Actions de droite (`ParallaxIconButton`), visibles sur l'image comme sur la barre. */
  right?: ReactNode
  /** Sous l'image : défile avec elle. */
  intro?: ReactNode
  /** Bouton flottant, posé en bas à droite du contenu. */
  floating?: ReactNode
  /** Actions principales, fixes en bas. */
  bottomBar?: ReactNode
  /** Écran racine d'un onglet : la barre d'onglets porte la safe area basse. */
  inTabs?: boolean
  style?: StyleProp<ViewStyle>
  /** Accès au défilement (retour en haut, positionnement). */
  scrollRef?: AnimatedRef<Animated.ScrollView>
  children: ReactNode
}

/**
 * Écran à en-tête image **sans onglets** : l'image glisse en parallaxe (moitié du défilement) et se replie en barre
 * compacte. Avec des onglets, utiliser `CollapsibleTabsScreen` (une liste virtualisée par onglet).
 */
export function ParallaxScreen({
  image,
  title,
  eyebrow,
  centered = false,
  barTitleStart = false,
  back = true,
  onBack,
  right,
  intro,
  floating,
  bottomBar,
  inTabs = false,
  style,
  scrollRef,
  children,
}: ParallaxScreenProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const scroll = useSharedValue(0)
  const progress = useSharedValue(0)
  const [viewport, setViewport] = useState(0)

  const barHeight = insets.top + TOP_BAR_HEIGHT

  const onScroll = useAnimatedScrollHandler((event) => {
    scroll.value = event.contentOffset.y
    progress.value = compactBarProgress(event.contentOffset.y, barHeight)
  })

  const imageStyle = useAnimatedStyle(() => ({ transform: heroImageTransform(scroll.value, reduced) }))
  const titleStyle = useAnimatedStyle(() => ({ opacity: heroTitleOpacity(scroll.value) }))
  const barStyle = useAnimatedStyle(() => ({ opacity: progress.value }))
  const statusScrim = useAnimatedStyle(() => ({ opacity: 1 - progress.value }))

  return (
    <ParallaxProgressProvider progress={progress}>
      <View style={[{ flex: 1, backgroundColor: colors.bg }, style]} onLayout={(event) => setViewport(event.nativeEvent.layout.height)}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          overScrollMode="never"
        >
          {/* Découpe qui déborde vers le haut (Reacticx) : au tiré, l'image zoomée couvre le haut de l'écran. */}
          <View style={{ marginTop: -HERO_HEIGHT * 4, paddingTop: HERO_HEIGHT * 4, overflow: 'hidden' }}>
            <View style={{ height: HERO_HEIGHT, backgroundColor: colors.surface }} accessible accessibilityRole="header" accessibilityLabel={title}>
              {image !== undefined && (
                <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
                  <Image source={image} contentFit="cover" style={StyleSheet.absoluteFill} />
                </Animated.View>
              )}
              {/* Fondu vers le fond en bas ; en haut, la barre d'état reste lisible sur n'importe quelle image. */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { experimental_backgroundImage: `linear-gradient(to top, ${colors.bg}, ${alpha(colors.bg, 0.4)}, transparent)` },
                ]}
              />
              <Animated.View
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
          {/* Le contenu remplit au moins l'espace sous la barre compacte : assez pour replier, sans défilement à vide. */}
          <View style={{ minHeight: Math.max(0, viewport - barHeight), paddingBottom: bottomBar || inTabs ? 0 : insets.bottom }}>{children}</View>
        </Animated.ScrollView>

        {floating && <View style={{ position: 'absolute', right: tokens.space[5], bottom: tokens.space[5] }}>{floating}</View>}

        {/* Lisibilité de la barre d'état : épinglé à l'écran (pas dans le contenu), il reste en place au rebond et
            s'efface quand la barre compacte devient opaque. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 112,
              zIndex: 15,
              experimental_backgroundImage: `linear-gradient(to bottom, ${alpha(colors.bg, 0.8)}, transparent)`,
            },
            statusScrim,
          ]}
        />

        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: barHeight, zIndex: 20 }}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, borderBottomWidth: HAIRLINE, borderBottomColor: colors.border }, barStyle]}
          />
          <CompactBarRow title={title} back={back} onBack={onBack} right={right} titleStart={barTitleStart} titleStyle={barStyle} />
        </View>

        {bottomBar && (
          <View
            style={{
              borderTopWidth: HAIRLINE,
              borderTopColor: colors.border,
              backgroundColor: colors.bg,
              paddingHorizontal: tokens.space[5],
              paddingTop: tokens.space[3],
              paddingBottom: tokens.space[3] + (inTabs ? 0 : insets.bottom),
            }}
          >
            {bottomBar}
          </View>
        )}
      </View>
    </ParallaxProgressProvider>
  )
}
