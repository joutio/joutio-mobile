import { StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CategoryIcon } from '../brand/category-icon'
import { useReducedMotion } from '../motion'
import { Avatar } from '../primitives/avatar'
import { Text } from '../primitives/text'
import { alpha } from '../theme/color'
import { ForceDark, useTheme } from '../theme/theme-provider'
import { keyframe, useTimeline } from '../timeline'
import { tokens, type CategoryCode, type TierCode } from '../tokens.generated'

export interface VersusPlayer {
  name: string
  tier?: TierCode
  src?: string
  /** Titre porté. */
  title?: string
  /** Ligne mono, par exemple « Or · 867 ». */
  detail?: string
}

export interface VersusIntroProps {
  me: VersusPlayer
  opponent: VersusPlayer
  topic: string
  category: CategoryCode
  rounds: number
  animated?: boolean
  /** Durée de la séquence (`VS_DURATION_MS` ; le lab joue 4 s). */
  duration?: number
  /** Déjà écoulé (le serveur a ouvert la fenêtre plus tôt) : la séquence reprend à cet endroit. */
  elapsedMs?: number
  onComplete?: () => void
}

function Panel({ player, side, t, height }: { player: VersusPlayer; side: 'top' | 'bottom'; t: ReturnType<typeof useTimeline>; height: number }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const top = side === 'top'
  const glow = player.tier ? tokens.tier[player.tier].hex : colors.accent
  const panel = useAnimatedStyle(() => {
    const y = keyframe(t.value, [
      [0, 1],
      [0.11, 0],
      [0.74, 0],
      [0.85, 1],
    ])
    return { transform: [{ translateY: (top ? -1 : 1) * y * height }] }
  })
  const content = useAnimatedStyle(() => {
    const stops = top
      ? ([
          [0.07, 0],
          [0.2, 1],
          [0.62, 1],
          [0.74, 0],
        ] as const)
      : ([
          [0.1, 0],
          [0.23, 1],
          [0.59, 1],
          [0.71, 0],
        ] as const)
    const shown = keyframe(t.value, stops)
    return { opacity: shown, transform: [{ translateX: (1 - shown) * (top ? -1.1 : 1.1) * 300 }] }
  })
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, right: 0, height, overflow: 'hidden', backgroundColor: top ? colors.surface : colors.bg },
        top ? { top: 0 } : { bottom: 0 },
        panel,
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { experimental_backgroundImage: `radial-gradient(circle at ${top ? '10% 90%' : '90% 10%'}, ${alpha(glow, 0.2)}, transparent 65%)` },
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: tokens.space[6],
            right: tokens.space[6],
            flexDirection: top ? 'row' : 'row-reverse',
            alignItems: 'center',
            gap: tokens.space[5],
          },
          top ? { top: insets.top + 40 } : { bottom: insets.bottom + 40 },
          content,
        ]}
      >
        <Avatar name={player.name} src={player.src} tier={player.tier} size="xxl" decorative />
        <View style={{ flexShrink: 1, minWidth: 0, gap: tokens.space[2], alignItems: top ? 'flex-start' : 'flex-end' }}>
          <Text variant="title2" weight="700" numberOfLines={1}>
            {player.name}
          </Text>
          {player.title && (
            <Text variant="caption" color="muted" numberOfLines={1}>
              {player.title}
            </Text>
          )}
          {player.detail && (
            <Text variant="callout" color="muted" mono numberOfLines={1}>
              {player.detail}
            </Text>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  )
}

function Body({ me, opponent, topic, category, rounds, animated = false, duration = 4000, elapsedMs, onComplete }: VersusIntroProps) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const { height } = useWindowDimensions()
  // État tenu : volets fermés, joueurs, VS et puce visibles (≈ 45 % de la séquence).
  const t = useTimeline({ duration, elapsedMs, animated: animated && !reduced, held: 0.45, onComplete })

  const cover = useAnimatedStyle(() => ({ opacity: t.value < 0.7401 ? 1 : 0 }))
  const seam = useAnimatedStyle(() => ({
    opacity: keyframe(t.value, [
      [0.14, 1],
      [0.24, 0],
      [0.64, 0],
      [0.7, 1],
    ]),
    transform: [
      {
        scaleX: keyframe(t.value, [
          [0.09, 0],
          [0.14, 1],
          [0.7, 1],
          [0.75, 0],
        ]),
      },
    ],
  }))
  const disc = useAnimatedStyle(() => {
    const scale = keyframe(t.value, [
      [0.18, 0],
      [0.26, 1.12],
      [0.3, 1],
      [0.58, 1],
      [0.62, 1.12],
      [0.7, 0],
    ])
    const rotate = keyframe(t.value, [
      [0.18, -90],
      [0.26, 0],
      [0.62, 0],
      [0.7, 90],
    ])
    const opacity = keyframe(t.value, [
      [0.18, 0],
      [0.26, 1],
      [0.62, 1],
      [0.7, 0],
    ])
    return { opacity, transform: [{ scale }, { rotate: `${rotate}deg` }] }
  })
  const ring = useAnimatedStyle(() => ({
    opacity: keyframe(t.value, [
      [0.25, 0],
      [0.27, 0.7],
      [0.42, 0],
      [0.59, 0],
      [0.61, 0.7],
      [0.7, 0],
    ]),
    transform: [
      {
        scale: keyframe(t.value, [
          [0.25, 0.8],
          [0.42, 2.4],
          [0.59, 2.4],
          [0.7, 0.8],
        ]),
      },
    ],
  }))
  const chip = useAnimatedStyle(() => {
    const shown = keyframe(t.value, [
      [0.28, 0],
      [0.36, 1],
      [0.54, 1],
      [0.6, 0],
    ])
    return { opacity: shown, transform: [{ translateY: (1 - shown) * 12 }] }
  })

  return (
    <View
      accessible
      accessibilityLabel={`${me.name} contre ${opponent.name}, ${topic}, ${rounds} manches`}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Le fond masque l'arène tant que les volets ne sont pas sur le point de s'ouvrir. */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, cover]} />
      <Panel player={me} side="top" t={t} height={height / 2} />
      <Panel player={opponent} side="bottom" t={t} height={height / 2} />
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: height / 2 - 1, height: 2, backgroundColor: colors.accent }, seam]} />
      <View style={{ position: 'absolute', top: height / 2 - 38, left: '50%', marginLeft: -38, width: 76, height: 76 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: radius.full, borderWidth: 2, borderColor: colors.accent }, ring]} />
        <Animated.View
          style={[
            {
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.full,
              backgroundColor: colors.accent,
              boxShadow: `0 0 0 8px ${alpha(colors.accent, 0.15)}`,
            },
            disc,
          ]}
        >
          <Text variant="title2" weight="700" color="onAccent">
            VS
          </Text>
        </Animated.View>
      </View>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: height / 2 + 54, alignItems: 'center' }, chip]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[3],
            paddingVertical: tokens.space[2],
            paddingLeft: tokens.space[2],
            paddingRight: tokens.space[4],
            borderRadius: radius.full,
            backgroundColor: colors.raised,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tokens.category[category].color,
            }}
          >
            <CategoryIcon category={category} size={12} weight="fill" color={colors.onAccent} />
          </View>
          <Text variant="caption" weight="600">
            {topic} · {rounds} manches
          </Text>
        </View>
      </Animated.View>
    </View>
  )
}

/** Face-à-face plein écran avant la première manche. Toujours sombre. */
export function VersusIntro(props: VersusIntroProps) {
  return (
    <ForceDark>
      <Body {...props} />
    </ForceDark>
  )
}
