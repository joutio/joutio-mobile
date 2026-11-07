import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Avatar } from '../primitives/avatar'
import { Text } from '../primitives/text'
import { tokens, type TierCode } from '../tokens.generated'
import { isTimerUrgent, type TimerState } from './timer-bar'

export interface DuelPlayer {
  name: string
  score: number
  tier?: TierCode
  src?: string
  /** Verdict de la dernière réponse confirmée par le serveur. */
  scoreState?: 'rest' | 'correct' | 'wrong'
}

export interface DuelHeaderProps {
  me: DuelPlayer
  opponent: DuelPlayer
  /** Secondes restantes, calculées par l'appelant. */
  seconds: number
  timerState?: TimerState
  lowAt?: number
  style?: StyleProp<ViewStyle>
}

const SCORE = { rest: 'accentInk', correct: 'correct', wrong: 'wrong' } as const

function Side({ player, end }: { player: DuelPlayer; end?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 0, flexDirection: end ? 'row-reverse' : 'row', alignItems: 'center', gap: tokens.space[4] }}>
      <Avatar name={player.name} src={player.src} tier={player.tier} size="list" decorative />
      <View style={{ flexShrink: 1, minWidth: 0, alignItems: end ? 'flex-end' : 'flex-start' }}>
        <Text variant="callout" weight="600" numberOfLines={1}>
          {player.name}
        </Text>
        <Text
          variant="numericMedium"
          color={SCORE[player.scoreState ?? 'rest']}
          accessibilityLabel={`${player.score} points${player.scoreState === 'correct' ? ', bonne réponse' : player.scoreState === 'wrong' ? ', mauvaise réponse' : ''}`}
        >
          {player.score}
        </Text>
      </View>
    </View>
  )
}

/** Haut de l'arène : les deux joueurs et leur score, le décompte au centre. */
export function DuelHeader({ me, opponent, seconds, timerState, lowAt, style }: DuelHeaderProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingTop: tokens.space[4],
          paddingBottom: tokens.space[3],
        },
        style,
      ]}
    >
      <Side player={me} />
      <Text
        variant="numericTimer"
        color={isTimerUrgent(seconds, timerState, lowAt) ? 'wrong' : 'text'}
        accessibilityRole="timer"
        accessibilityLabel={`${seconds} secondes restantes`}
        maxFontSizeMultiplier={1.2}
      >
        {seconds}
      </Text>
      <Side player={opponent} end />
    </View>
  )
}
