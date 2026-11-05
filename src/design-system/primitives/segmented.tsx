import { useEffect, useRef, useState } from 'react'
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  ReduceMotion,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated'
import { useReducedMotion } from '../motion'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { NativeSegmented } from './native-segmented'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

/** Largeur de référence du centre de la pastille, étiré ensuite par `scaleX`. */
const PILL_BASE_WIDTH = 100

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  /** Options à leur largeur et défilement horizontal, pour les longues listes d'onglets. */
  scrollable?: boolean
  /**
   * Position fractionnaire du pager (`indexDecimal` de collapsible-tab) : l'indicateur suit le balayage au doigt.
   * Absente, il glisse en ressort vers l'option choisie.
   */
  position?: SharedValue<number>
  style?: StyleProp<ViewStyle>
}

/**
 * Choix exclusif entre quelques options. Natif sur iOS et Android (`NativeSegmented`) ; barre faite main quand elle
 * défile (`scrollable`, longue liste d'onglets) ou qu'elle **suit un pager** (`position`) : aucun contrôle système ne
 * défile ni ne suit le doigt.
 */
export function Segmented<T extends string>(props: SegmentedProps<T>) {
  if (!props.scrollable && !props.position && Platform.OS !== 'web') return <NativeSegmented {...props} />
  return <ScrollableSegmented {...props} />
}

function ScrollableSegmented<T extends string>({ options, value, onChange, label, scrollable = false, position, style }: SegmentedProps<T>) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const scroller = useAnimatedRef<Animated.ScrollView>()
  const [width, setWidth] = useState(0)
  const viewport = useSharedValue(0)
  const content = useSharedValue(0)
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  // Positions mesurées : tenues côté JS (une écriture de shared value n'est pas relisible tout de suite),
  // puis publiées d'un bloc pour l'indicateur, sur le thread UI.
  const measured = useRef<{ x: number; width: number }[]>([])
  const frames = useSharedValue<{ x: number; width: number }[]>([])
  const spring = useSharedValue(selectedIndex)
  const ready = useSharedValue(0)

  useEffect(() => {
    spring.value = reduced ? selectedIndex : withSpring(selectedIndex, { mass: 1, stiffness: 420, damping: 34, reduceMotion: ReduceMotion.Never })
  }, [selectedIndex, reduced, spring])

  // Sans pager : garde l'option active centrée une fois choisie, sans animation en mouvement réduit.
  useEffect(() => {
    const frame = measured.current[selectedIndex]
    if (!scrollable || position || !frame || width === 0) return
    scroller.current?.scrollTo({ x: Math.max(0, frame.x - (width - frame.width) / 2), animated: !reduced })
  }, [scrollable, position, selectedIndex, width, reduced, scroller])

  // Indicateur courant (position et largeur), interpolé entre deux options pendant le balayage.
  const current = useDerivedValue(() => {
    const list = frames.value
    const p = Math.min(Math.max(position ? position.value : spring.value, 0), Math.max(list.length - 1, 0))
    const from = list[Math.floor(p)]
    const to = list[Math.ceil(p)] ?? from
    if (!from || !to) return null
    const t = p - Math.floor(p)
    return { x: from.x + (to.x - from.x) * t, width: from.width + (to.width - from.width) * t }
  })

  // Avec un pager, la barre défile **avec le doigt** pour garder l'indicateur centré, et s'aimante avec lui.
  useAnimatedReaction(
    () => (scrollable && position && current.value && viewport.value > 0 ? current.value.x - (viewport.value - current.value.width) / 2 : null),
    (x) => {
      if (x !== null) scrollTo(scroller, Math.min(Math.max(0, x), Math.max(0, content.value - viewport.value)), 0, false)
    },
  )
  // Uniquement `transform` et `opacity` : animer `width` relancerait la mise en page à chaque frame du balayage.
  // La pastille est faite de deux bouts arrondis fixes et d'un centre étiré (`scaleX`), sans déformer les coins.
  const r = radius.sm
  const visible = useAnimatedStyle(() => ({ opacity: current.value ? ready.value : 0 }))
  const leftCap = useAnimatedStyle(() => ({ transform: [{ translateX: current.value?.x ?? 0 }] }))
  const rightCap = useAnimatedStyle(() => ({ transform: [{ translateX: current.value ? current.value.x + current.value.width - r : 0 }] }))
  const middle = useAnimatedStyle(() => {
    const frame = current.value
    if (!frame) return { transform: [{ translateX: 0 }, { scaleX: 0 }] }
    // Recouvre les bouts d'un demi-point pour éviter une couture visible.
    return { transform: [{ translateX: frame.x + r - 0.5 }, { scaleX: Math.max(frame.width - 2 * r + 1, 0) / PILL_BASE_WIDTH }] }
  })

  const items = options.map((option, index) => {
    const selected = index === selectedIndex
    return (
      <PressableScale
        key={option.value}
        accessibilityRole="radio"
        accessibilityLabel={option.label}
        accessibilityState={{ checked: selected }}
        accessibilityHint={`${index + 1} sur ${options.length}`}
        pressedScale={1}
        haptic="selection"
        onPress={() => onChange(option.value)}
        onLayout={(event) => {
          const { x, width: itemWidth } = event.nativeEvent.layout
          measured.current[index] = { x, width: itemWidth }
          if (measured.current.filter(Boolean).length < options.length) return
          frames.value = [...measured.current]
          ready.value = 1
        }}
        style={({ pressed }) => ({
          height: 36,
          flexGrow: scrollable ? 0 : 1,
          flexBasis: scrollable ? 'auto' : 0,
          paddingHorizontal: scrollable ? tokens.space[5] : 6,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text variant="callout" weight={selected ? '600' : undefined} color={selected ? 'text' : 'muted'} numberOfLines={1}>
          {option.label}
        </Text>
      </PressableScale>
    )
  })

  // L'indicateur est dans le même repère que les options (padding du rail compris).
  const rail: ViewStyle = { flexDirection: 'row', gap: 2, padding: tokens.space[2] }
  const piece: ViewStyle = { position: 'absolute', left: 0, top: 0, height: 36, backgroundColor: colors.surface }
  const pill = (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: tokens.space[2], height: 36 }, visible]}>
      <Animated.View style={[piece, { width: PILL_BASE_WIDTH, transformOrigin: 'left' }, middle]} />
      <Animated.View style={[piece, { width: r, borderTopLeftRadius: r, borderBottomLeftRadius: r }, leftCap]} />
      <Animated.View style={[piece, { width: r, borderTopRightRadius: r, borderBottomRightRadius: r }, rightCap]} />
    </Animated.View>
  )
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width)
        viewport.value = event.nativeEvent.layout.width
      }}
      style={[{ alignSelf: 'stretch', borderRadius: radius.md, backgroundColor: colors.raised, overflow: 'hidden' }, style]}
    >
      {scrollable ? (
        <Animated.ScrollView
          ref={scroller}
          horizontal
          // iOS : seul le défilement principal de l'écran répond au toucher de la barre d'état.
          scrollsToTop={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rail}
          onContentSizeChange={(contentWidth) => (content.value = contentWidth)}
        >
          {pill}
          {items}
        </Animated.ScrollView>
      ) : (
        <View style={rail}>
          {pill}
          {items}
        </View>
      )}
    </View>
  )
}
