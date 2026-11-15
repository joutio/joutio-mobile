import { View, type StyleProp, type ViewStyle } from 'react-native'
import { PlayerName } from '../primitives/player-name'
import { Avatar } from '../primitives/avatar'
import { Text } from '../primitives/text'
import { tokens, type TierCode } from '../tokens.generated'
import { isTimerUrgent, type TimerState } from './timer-bar'
import { useT } from '@/lib/i18n'

export interface DuelPlayer {
  name: string
  premium?: boolean
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
        <PlayerName name={player.name} premium={player.premium} badgeSize={16} variant="callout" weight="600" justify={end ? 'flex-end' : 'flex-start'} />
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
  const t = useT()
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
      {/* Deux chiffres réservés (« 00 » invisible, police mono) : la rangée ne bouge pas de 10 à 9. */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="numericTimer" maxFontSizeMultiplier={1.2} style={{ opacity: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          00
        </Text>
        <Text
          variant="numericTimer"
          color={isTimerUrgent(seconds, timerState, lowAt) ? 'wrong' : 'text'}
          accessibilityRole="timer"
          accessibilityLabel={t('mobile.ds.secondsLeft', { seconds })}
          maxFontSizeMultiplier={1.2}
          style={{ position: 'absolute' }}
        >
          {seconds}
        </Text>
      </View>
      <Side player={opponent} end />
    </View>
  )
}
