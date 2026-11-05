import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

const HEADS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export interface StreakCalendarProps {
  month: string
  legend?: string
  /** Cases vides avant le 1er du mois. */
  offset: number
  days: number
  /** Jour courant ; 0 pour un mois passé, plus de `days` pour un mois futur. */
  today: number
  /** Jours joués. */
  active: readonly number[]
  style?: StyleProp<ViewStyle>
}

const CELL = `${100 / 7}%` as const

/** Calendrier du mois : jours joués en accent, aujourd'hui cerclé, jours à venir estompés. */
export function StreakCalendar({ month, legend, offset, days, today, active, style }: StreakCalendarProps) {
  const { colors } = useTheme()
  const played = new Set(active)
  return (
    <View accessibilityLabel={month} style={[{ alignSelf: 'stretch', gap: tokens.space[3] }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space[3] }}>
        <Text variant="headline" accessibilityRole="header">
          {month}
        </Text>
        {legend && (
          <Text variant="caption" color="muted">
            {legend}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -tokens.space[1] }}>
        {HEADS.map((head, index) => (
          <View
            key={`head-${index}`}
            style={{ width: CELL, padding: tokens.space[1] }}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <Text variant="caption" weight="600" color="muted" align="center">
              {head}
            </Text>
          </View>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <View key={`empty-${index}`} style={{ width: CELL }} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1
          const isPlayed = played.has(day)
          const isToday = day === today
          return (
            <View key={day} style={{ width: CELL, padding: tokens.space[1] }}>
              <View
                accessible
                // La couleur ne suffit pas : l'état du jour est aussi dit en toutes lettres.
                accessibilityLabel={[String(day), isPlayed && 'joué', isToday && "aujourd'hui"].filter(Boolean).join(', ')}
                style={{
                  aspectRatio: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isPlayed ? colors.accent : colors.raised,
                  borderWidth: isToday ? 2 : 0,
                  borderColor: colors.accent,
                  opacity: day > today ? 0.35 : 1,
                }}
              >
                <Text variant="caption" weight="600" mono color={isPlayed ? 'onAccent' : 'muted'}>
                  {day}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}
