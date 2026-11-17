import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '../primitives/text'
import { tokens } from '../tokens.generated'
import { currentLanguage, t, useT } from '@/lib/i18n'

export interface AnswerTiming {
  name: string
  /** Temps de réponse. Absent : pas de réponse. */
  seconds?: number
  points: number
}

export interface AnswerTimingRowProps {
  me: AnswerTiming
  opponent: AnswerTiming
  /** Premier à avoir répondu. */
  first?: 'me' | 'opponent'
  style?: StyleProp<ViewStyle>
}

const duration = (seconds: number) => t('ds.seconds', { value: seconds.toLocaleString(currentLanguage(), { maximumFractionDigits: 1 }) })

function Timing({ player, first, end }: { player: AnswerTiming; first: boolean; end?: boolean }) {
  const t = useT()
  const color = first ? 'accentInk' : 'muted'
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: end ? 'flex-end' : 'flex-start' }}>
      <Text variant="caption" weight="600" mono color={color} numberOfLines={1}>
        {first ? t('ds.first') : ''}
        {player.name}
      </Text>
      <Text variant="caption" mono color={color} numberOfLines={1}>
        {player.seconds === undefined ? t('ds.noAnswer') : duration(player.seconds)} · {player.points > 0 ? `+${player.points}` : player.points}
      </Text>
    </View>
  )
}

/** Temps et gain de chaque joueur sur une manche (le pseudonyme, jamais « toi »). */
export function AnswerTimingRow({ me, opponent, first, style }: AnswerTimingRowProps) {
  return (
    <View style={[{ flexDirection: 'row', gap: tokens.space[4] }, style]}>
      <Timing player={me} first={first === 'me'} />
      <Timing player={opponent} first={first === 'opponent'} end />
    </View>
  )
}
