import { useEffect } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { isTimerUrgent } from '../duel/timer-bar'
import { Avatar } from '../primitives/avatar'
import { PlayerName } from '../primitives/player-name'
import { Button } from '../primitives/button'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { useT } from '@/lib/i18n'

export interface RematchPromptProps {
  name: string
  premium?: boolean
  tier?: TierCode
  src?: string
  topic: string
  /** Secondes restantes, calculées par l'appelant. */
  seconds: number
  /** Délai de la proposition. */
  total?: number
  lowAt?: number
  accepting?: boolean
  declining?: boolean
  onAccept?: () => void
  onDecline?: () => void
  style?: StyleProp<ViewStyle>
}

const RING = 120
const STROKE = 5
const R = (RING - STROKE) / 2
const C = 2 * Math.PI * R
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** Proposition de revanche, posée par l'écran au-dessus d'un voile : anneau du délai autour de l'avatar. */
export function RematchPrompt({
  name,
  premium = false,
  tier,
  src,
  topic,
  seconds,
  total = 10,
  lowAt = 3,
  accepting = false,
  declining = false,
  onAccept,
  onDecline,
  style,
}: RematchPromptProps) {
  const t = useT()
  const { colors, radius } = useTheme()
  // L'anneau vise la fin de la seconde en cours (1 s linéaire) : il se vide en continu, sans saut au tic.
  const target = Math.min(1, Math.max(0, (seconds - 1) / total))
  const fraction = useSharedValue(Math.min(1, Math.max(0, seconds / total)))
  useEffect(() => {
    fraction.value = withTiming(target, { duration: 1000, easing: Easing.linear })
  }, [fraction, target])
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - fraction.value) }))
  const urgent = isTimerUrgent(seconds, 'running', lowAt)
  return (
    <View
      accessibilityRole="alert"
      accessibilityViewIsModal
      accessibilityLabel={t('mobile.ds.rematchA11y', { name, topic })}
      style={[
        {
          alignItems: 'center',
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingTop: tokens.space[6],
          paddingBottom: tokens.space[5],
          borderRadius: radius.xl,
          backgroundColor: colors.surface,
          boxShadow: colors.shadow,
        },
        style,
      ]}
    >
      <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={RING} height={RING} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={colors.raised} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            stroke={urgent ? colors.wrong : colors.accent}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${C} ${C}`}
            animatedProps={ringProps}
          />
        </Svg>
        <Avatar name={name} src={src} tier={tier} size="xxl" decorative />
      </View>
      <Text
        variant="caption"
        mono
        weight={urgent ? '600' : undefined}
        color={urgent ? 'wrong' : 'muted'}
        accessibilityRole="timer"
        accessibilityLabel={t(seconds > 1 ? 'ds.secondsToAnswerMany' : 'ds.secondsToAnswerOne', { count: seconds })}
      >
        {seconds} s
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: tokens.space[2] }}>
        <PlayerName name={name} premium={premium} badgeSize={22} variant="title2" />
        <Text variant="title2" align="center">
          {t('mobile.ds.wantsRematch')}
        </Text>
      </View>
      <Text variant="callout" color="muted" align="center">
        {t('mobile.ds.sameTopic')} {topic}
      </Text>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: tokens.space[3], marginTop: tokens.space[2] }}>
        <View style={{ flex: 1 }}>
          <Button variant="tinted" tone="destructive" full loading={declining} disabled={accepting} onPress={onDecline}>
            {t('challenges.decline')}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button full loading={accepting} disabled={declining} onPress={onAccept}>
            {t('challenges.accept')}
          </Button>
        </View>
      </View>
    </View>
  )
}
