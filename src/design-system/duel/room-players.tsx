import { View, type StyleProp, type ViewStyle } from 'react-native'
import { ClockIcon, LightningIcon, UserPlusIcon } from '../icons'
import { PlayerName } from '../primitives/player-name'
import { Avatar } from '../primitives/avatar'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'

export interface RoomPlayer {
  name: string
  premium?: boolean
  tier?: TierCode
  src?: string
  /** État sous le nom ; « Dans le salon » (présent) ou « Pas encore là » (absent) par défaut. */
  status?: string
  /** Pas encore arrivé : avatar estompé, horloge, état en gris. */
  away?: boolean
}

export interface RoomPlayersProps {
  me: RoomPlayer
  /** Absent : place libre (salon partagé sans second joueur). */
  opponent?: RoomPlayer
  style?: StyleProp<ViewStyle>
}

function Seat({ player }: { player: RoomPlayer }) {
  const { colors, radius } = useTheme()
  const away = player.away ?? false
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: tokens.space[3] }}>
      <View style={{ opacity: away ? 0.45 : 1 }}>
        <Avatar name={player.name} src={player.src} tier={player.tier} size="xxl" decorative />
        {/* Présence (2026-11-07, comme joutio-web) : coche verte une fois arrivé, horloge tant qu'il manque. */}
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 28,
            height: 28,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: colors.bg,
            backgroundColor: away ? colors.raised : colors.correct,
          }}
        >
          {away ? <ClockIcon size={14} weight="bold" color={colors.muted} /> : <LightningIcon size={14} weight="fill" color={colors.bg} />}
        </View>
      </View>
      <PlayerName name={player.name} premium={player.premium} justify="center" />
      <Text variant="caption" weight="600" color={away ? 'muted' : 'correct'} accessibilityLiveRegion="polite">
        {player.status ?? (away ? 'Pas encore là' : 'Dans le salon')}
      </Text>
    </View>
  )
}

/** Face-à-face du salon : présence de chacun, place encore libre, éclair vert quand les deux sont là. */
export function RoomPlayers({ me, opponent, style }: RoomPlayersProps) {
  const { colors, radius } = useTheme()
  const ready = Boolean(opponent) && !me.away && !opponent?.away
  return (
    <View
      accessibilityLabel={ready ? 'Les deux joueurs sont là' : undefined}
      style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] }, style]}
    >
      <Seat player={me} />
      <View
        style={{
          marginTop: 30,
          width: 28,
          height: 28,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ready ? colors.correct : colors.raised,
        }}
      >
        <LightningIcon size={14} weight="fill" color={ready ? colors.bg : colors.muted} />
      </View>
      {opponent ? (
        <Seat player={opponent} />
      ) : (
        <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: tokens.space[3] }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserPlusIcon size={30} color={colors.muted} />
          </View>
          <Text variant="headline" color="muted">
            En attente
          </Text>
          <Text variant="caption" color="muted" align="center">
            Le duel démarre à deux
          </Text>
        </View>
      )}
    </View>
  )
}
