import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CheckIcon, FireIcon, XIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export type StreakDay = 'done' | 'today' | 'missed' | 'future'

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const STATE_NAMES: Record<StreakDay, string> = { done: 'joué', today: "aujourd'hui", missed: 'manqué', future: 'à venir' }

export interface StreakProps {
  count: number
  hint?: string
  /** Sept jours, du lundi au dimanche. */
  week?: readonly StreakDay[]
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

/** Série de jours joués : compteur à la flamme, puis la semaine en cours. */
export function Streak({ count, hint, week, compact = false, style }: StreakProps) {
  const { colors, radius } = useTheme()
  const active = count > 0
  const label = count > 1 ? `${count} jours` : `${count} jour`
  return (
    <View style={[{ alignSelf: 'stretch', gap: tokens.space[5] }, style]}>
      <View
        accessible
        accessibilityLabel={[`Série de ${label}`, hint].filter(Boolean).join(', ')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? colors.warm : colors.raised,
          }}
        >
          <FireIcon size={24} weight="fill" color={active ? colors.accentInk : colors.muted} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text variant="numeric">{label}</Text>
          {hint && (
            <Text variant="caption" color="muted">
              {hint}
            </Text>
          )}
        </View>
      </View>
      {!compact && week && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.map((day, index) => {
            const background = day === 'done' ? colors.accent : day === 'missed' ? colors.wrong : 'transparent'
            const border =
              day === 'today' ? { borderWidth: 2, borderColor: colors.accent } : day === 'future' ? { borderWidth: 1, borderColor: colors.border } : null
            const ink = day === 'done' ? colors.onAccent : day === 'missed' ? colors.onWrong : day === 'today' ? colors.accentInk : colors.muted
            return (
              <View
                key={index}
                accessible
                accessibilityLabel={`${DAY_NAMES[index]}, ${STATE_NAMES[day]}`}
                style={{ alignItems: 'center', gap: tokens.space[2] }}
              >
                <Text variant="caption" weight="600" color="muted">
                  {DAY_LABELS[index]}
                </Text>
                <View
                  style={[
                    { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: background },
                    border,
                  ]}
                >
                  {day === 'done' && <CheckIcon size={16} color={ink} />}
                  {day === 'today' && <FireIcon size={16} weight="fill" color={ink} />}
                  {day === 'missed' && <XIcon size={16} color={ink} />}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
