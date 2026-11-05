import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Avatar } from './avatar'
import { Badge, type BadgeVariant } from './badge'
import { Button } from './button'
import { ProgressBar } from './progress-bar'
import { Text } from './text'

export type RewardState = 'unlocked' | 'active' | 'locked' | 'premium'

const STATES: Record<RewardState, { variant: BadgeVariant; label: string }> = {
  unlocked: { variant: 'correct', label: 'Débloquée' },
  active: { variant: 'accent', label: 'Utilisée' },
  locked: { variant: 'neutral', label: 'Verrouillée' },
  premium: { variant: 'accent', label: 'Premium' },
}

export interface RewardCardProps {
  title: string
  rule?: string
  state?: RewardState
  image?: string
  /** Avancement vers le déblocage, de 0 à 100. */
  progress?: number
  progressLabel?: string
  cta?: { label: string; onPress?: () => void }
  style?: StyleProp<ViewStyle>
}

/** Style d'avatar à débloquer : aperçu, état, condition et avancement. */
export function RewardCard({ title, rule, state = 'unlocked', image, progress, progressLabel, cta, style }: RewardCardProps) {
  const { colors, radius } = useTheme()
  const { variant, label } = STATES[state]
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[5],
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          padding: tokens.space[5],
          borderWidth: state === 'active' ? 2 : 0,
          borderColor: colors.accent,
        },
        style,
      ]}
    >
      <Avatar name={title} src={image} size="xl" locked={state === 'locked' || state === 'premium'} />
      <View style={{ flex: 1, minWidth: 0, gap: tokens.space[2] }}>
        <View accessible style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[3] }}>
          <Text variant="headline">{title}</Text>
          <Badge variant={variant}>{label}</Badge>
        </View>
        {rule && (
          <Text variant="callout" color="muted">
            {rule}
          </Text>
        )}
        {progress !== undefined && <ProgressBar value={progress} label={progressLabel} showValue />}
        {cta && (
          <View style={{ marginTop: tokens.space[2], flexDirection: 'row' }}>
            <Button size="S" variant={state === 'premium' ? 'filled' : 'gray'} tone={state === 'premium' ? 'accent' : 'neutral'} onPress={cta.onPress}>
              {cta.label}
            </Button>
          </View>
        )}
      </View>
    </View>
  )
}
