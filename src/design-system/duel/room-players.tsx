import { View, type StyleProp, type ViewStyle } from 'react-native'
import { UserPlusIcon } from '../icons'
import { Avatar } from '../primitives/avatar'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'

export interface RoomPlayer {
  name: string
  tier?: TierCode
  src?: string
  /** État sous le nom ; « Dans le salon » par défaut. */
  status?: string
  /** Pas encore arrivé : état en gris. */
  away?: boolean
}

export interface RoomPlayersProps {
  me: RoomPlayer
  /** Absent : place libre. */
  opponent?: RoomPlayer
  style?: StyleProp<ViewStyle>
}

function Seat({ player }: { player: RoomPlayer }) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: tokens.space[3] }}>
      <Avatar name={player.name} src={player.src} tier={player.tier} size="xxl" decorative />
      <Text variant="headline" numberOfLines={1}>
        {player.name}
      </Text>
      <Text variant="caption" weight="600" color={player.away ? 'muted' : 'correct'}>
        {player.status ?? 'Dans le salon'}
      </Text>
    </View>
  )
}

/** Face-à-face du salon, avec la place encore libre. */
export function RoomPlayers({ me, opponent, style }: RoomPlayersProps) {
  const { colors, radius } = useTheme()
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[4] }, style]}>
      <Seat player={me} />
      <Text variant="caption" weight="600" color="muted" style={{ paddingTop: 40 }}>
        vs
      </Text>
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
